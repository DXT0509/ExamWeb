-- Migration 20260808190000_fullscreen_integrity.sql
-- Phase 8: Fullscreen Integrity RPCs & Event Logging

-- 1. Update get_attempt_payload to include fullscreen_required
create or replace function public.get_attempt_payload(p_attempt_id uuid, p_guest_session_hash text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  target_exam public.exams;
  now_ts timestamptz := now();
  sections_json jsonb;
  answers_json jsonb;
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_FOUND';
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ATTEMPT_ACCESS';
  end if;

  -- Auto submit if expired and still in_progress
  if target_attempt.status = 'in_progress' and now_ts >= target_attempt.deadline_at then
    perform public.submit_attempt(p_attempt_id, p_guest_session_hash, null, 'time_expired');
    select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id;
  end if;

  select * into target_exam from public.exams e where e.id = target_attempt.exam_id;

  -- Build sections + questions + options WITHOUT correct_option_id or is_correct
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'description', s.description,
      'position', s.position,
      'questions', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'content', q.content,
            'image_path', q.image_path,
            'score', q.score,
            'position', q.position,
            'options', (
              select coalesce(jsonb_agg(
                jsonb_build_object(
                  'id', o.id,
                  'content', o.content,
                  'position', o.position
                ) order by o.position
              ), '[]'::jsonb)
              from public.question_options o
              where o.question_id = q.id and o.is_active and o.deleted_at is null
            )
          ) order by q.position
        ), '[]'::jsonb)
        from public.questions q
        where q.section_id = s.id and q.is_active and q.deleted_at is null
      )
    ) order by s.position
  ), '[]'::jsonb) into sections_json
  from public.exam_sections s
  where s.exam_id = target_exam.id and s.deleted_at is null;

  -- Build existing answers
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', a.question_id,
      'selected_option_id', a.selected_option_id,
      'is_marked', a.is_marked,
      'answered_at', a.answered_at
    )
  ), '[]'::jsonb) into answers_json
  from public.attempt_answers a
  where a.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', target_attempt.id,
    'exam_id', target_exam.id,
    'exam_title', target_exam.title,
    'exam_description', target_exam.description,
    'duration_minutes', target_exam.duration_minutes,
    'total_score', target_exam.total_score,
    'fullscreen_required', target_exam.fullscreen_required,
    'status', target_attempt.status,
    'started_at', target_attempt.started_at,
    'deadline_at', target_attempt.deadline_at,
    'submitted_at', target_attempt.submitted_at,
    'server_now', now_ts,
    'sections', sections_json,
    'answers', answers_json
  );
end;
$$;

-- 2. Create RPC: record_exam_event
create or replace function public.record_exam_event(
  p_attempt_id uuid,
  p_event_type public.exam_event_type,
  p_client_occurred_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb,
  p_guest_session_hash text default null
)
returns table (
  event_id uuid,
  server_occurred_at timestamptz,
  is_duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  target_exam public.exams;
  existing_event public.exam_events;
  new_event_id uuid;
  now_ts timestamptz := now();
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_FOUND';
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ATTEMPT_ACCESS';
  end if;

  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_ALREADY_FINALIZED';
  end if;

  select * into target_exam from public.exams e where e.id = target_attempt.exam_id;

  -- For violation events (fullscreen_exit or visibility_hidden), check for an active unresolved violation
  if p_event_type in ('fullscreen_exit', 'visibility_hidden') then
    if not target_exam.fullscreen_required then
      raise exception using errcode = 'P0001', message = 'FULLSCREEN_NOT_REQUIRED';
    end if;

    select * into existing_event
    from public.exam_events e
    where e.attempt_id = p_attempt_id
      and e.event_type in ('fullscreen_exit', 'visibility_hidden')
      and e.resolved_at is null
    order by e.server_occurred_at desc
    limit 1;

    if found then
      event_id := existing_event.id;
      server_occurred_at := existing_event.server_occurred_at;
      is_duplicate := true;
      return next;
      return;
    end if;
  end if;

  insert into public.exam_events (
    attempt_id,
    event_type,
    client_occurred_at,
    server_occurred_at,
    metadata
  ) values (
    p_attempt_id,
    p_event_type,
    p_client_occurred_at,
    now_ts,
    p_metadata
  ) returning id into new_event_id;

  event_id := new_event_id;
  server_occurred_at := now_ts;
  is_duplicate := false;
  return next;
  return;
end;
$$;

-- 3. Create RPC: resolve_exam_event
create or replace function public.resolve_exam_event(
  p_attempt_id uuid,
  p_guest_session_hash text default null
)
returns table (success boolean, resolved_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  now_ts timestamptz := now();
  cnt integer := 0;
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id for update;
  if not found then
    success := false; resolved_count := 0; return next; return;
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    success := false; resolved_count := 0; return next; return;
  end if;

  if target_attempt.status <> 'in_progress' then
    success := false; resolved_count := 0; return next; return;
  end if;

  -- Mark active violations as resolved
  update public.exam_events
  set resolved_at = now_ts
  where attempt_id = p_attempt_id
    and event_type in ('fullscreen_exit', 'visibility_hidden')
    and resolved_at is null;

  get diagnostics cnt = row_count;

  if cnt > 0 then
    insert into public.exam_events (attempt_id, event_type, metadata)
    values (p_attempt_id, 'violation_resolved', jsonb_build_object('resolved_count', cnt));
  end if;

  success := true;
  resolved_count := cnt;
  return next;
  return;
end;
$$;

-- 4. Update RPC: submit_attempt to verify fullscreen_violation grace period
create or replace function public.submit_attempt(
  p_attempt_id uuid,
  p_guest_session_hash text default null,
  p_idempotency_key text default null,
  p_submit_reason public.submit_reason default 'student_submit'
)
returns table (
  success boolean,
  code text,
  attempt_status public.attempt_status,
  score numeric(10,2),
  max_score numeric(10,2),
  correct_answers integer,
  wrong_answers integer,
  blank_answers integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  target_exam public.exams;
  active_violation public.exam_events;
  now_ts timestamptz := now();
  final_reason public.submit_reason;
  final_status public.attempt_status;
  q_record record;
  user_ans_opt_id uuid;
  computed_score numeric(10,2) := 0;
  cnt_correct integer := 0;
  cnt_wrong integer := 0;
  cnt_blank integer := 0;
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id for update;
  if not found then
    success := false; code := 'ATTEMPT_NOT_FOUND'; return next; return;
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    success := false; code := 'FORBIDDEN_ATTEMPT_ACCESS'; return next; return;
  end if;

  -- Idempotency check: if already finalized, return existing score
  if target_attempt.status <> 'in_progress' then
    success := true;
    code := 'ALREADY_SUBMITTED';
    attempt_status := target_attempt.status;
    score := target_attempt.score;
    max_score := target_attempt.max_score;
    correct_answers := target_attempt.correct_answers;
    wrong_answers := target_attempt.wrong_answers;
    blank_answers := target_attempt.blank_answers;
    return next;
    return;
  end if;

  select * into target_exam from public.exams e where e.id = target_attempt.exam_id;

  -- Determine final status & reason
  if now_ts >= target_attempt.deadline_at or p_submit_reason = 'time_expired' then
    final_status := 'auto_submitted';
    final_reason := 'time_expired';
  elsif p_submit_reason = 'account_locked' then
    final_status := 'auto_submitted';
    final_reason := 'account_locked';
  elsif p_submit_reason = 'fullscreen_violation' then
    if not target_exam.fullscreen_required then
      success := false; code := 'FULLSCREEN_NOT_REQUIRED'; return next; return;
    end if;

    -- Verify that an unresolved violation exists and du 5s
    select * into active_violation
    from public.exam_events e
    where e.attempt_id = p_attempt_id
      and e.event_type in ('fullscreen_exit', 'visibility_hidden')
      and e.resolved_at is null
    order by e.server_occurred_at desc
    limit 1;

    if not found then
      success := false; code := 'NO_ACTIVE_VIOLATION_EVENT'; return next; return;
    end if;

    if now_ts - active_violation.server_occurred_at < interval '5 seconds' then
      success := false; code := 'VIOLATION_GRACE_PERIOD_ACTIVE'; return next; return;
    end if;

    final_status := 'auto_submitted';
    final_reason := 'fullscreen_violation';
  else
    final_status := 'submitted';
    final_reason := coalesce(p_submit_reason, 'student_submit');
  end if;

  -- Server-side scoring calculation
  for q_record in
    select q.id as question_id, q.score as question_score, o.id as correct_option_id
    from public.questions q
    join public.exam_sections s on s.id = q.section_id
    left join public.question_options o on o.question_id = q.id and o.is_correct = true and o.is_active and o.deleted_at is null
    where s.exam_id = target_exam.id and s.deleted_at is null and q.is_active and q.deleted_at is null
  loop
    select a.selected_option_id into user_ans_opt_id
    from public.attempt_answers a
    where a.attempt_id = p_attempt_id and a.question_id = q_record.question_id;

    if user_ans_opt_id is null then
      cnt_blank := cnt_blank + 1;
    elsif user_ans_opt_id = q_record.correct_option_id then
      cnt_correct := cnt_correct + 1;
      computed_score := computed_score + q_record.question_score;
    else
      cnt_wrong := cnt_wrong + 1;
    end if;
  end loop;

  -- Finalize attempt in single transaction
  update public.exam_attempts a set
    status = final_status,
    submit_reason = final_reason,
    submitted_at = now_ts,
    finalized_at = now_ts,
    score = computed_score,
    max_score = target_exam.total_score,
    correct_answers = cnt_correct,
    wrong_answers = cnt_wrong,
    blank_answers = cnt_blank,
    idempotency_key = coalesce(p_idempotency_key, a.idempotency_key)
  where a.id = p_attempt_id;

  -- Log event
  insert into public.exam_events (attempt_id, event_type, metadata)
  values (
    p_attempt_id,
    case when final_status = 'auto_submitted' then 'auto_submit_requested'::public.exam_event_type else 'submit_completed'::public.exam_event_type end,
    jsonb_build_object('reason', final_reason, 'score', computed_score)
  );

  success := true;
  code := 'OK';
  attempt_status := final_status;
  score := computed_score;
  max_score := target_exam.total_score;
  correct_answers := cnt_correct;
  wrong_answers := cnt_wrong;
  blank_answers := cnt_blank;
  return next;
  return;
end;
$$;

grant execute on function public.record_exam_event(uuid, public.exam_event_type, timestamptz, jsonb, text) to anon, authenticated;
grant execute on function public.resolve_exam_event(uuid, text) to anon, authenticated;
