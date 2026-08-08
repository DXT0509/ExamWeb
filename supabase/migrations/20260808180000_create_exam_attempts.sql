-- Phase 7: Exam Attempts, Answers, Events and Engine RPCs

create type public.attempt_status as enum ('in_progress', 'submitted', 'auto_submitted', 'expired');
create type public.submit_reason as enum ('student_submit', 'time_expired', 'fullscreen_violation', 'account_locked', 'system_recovery');
create type public.exam_event_type as enum (
  'attempt_started',
  'answer_saved',
  'fullscreen_exit',
  'visibility_hidden',
  'fullscreen_return',
  'visibility_visible',
  'fullscreen_unsupported',
  'violation_resolved',
  'account_locked',
  'auto_submit_requested',
  'submit_requested',
  'submit_completed',
  'network_recovered'
);

-- 1. exam_attempts
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id),
  student_id uuid null references public.profiles(id),
  guest_session_hash text null,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz null,
  submit_reason public.submit_reason null,
  score numeric(10,2) null,
  max_score numeric(10,2) null,
  correct_answers integer null,
  wrong_answers integer null,
  blank_answers integer null,
  idempotency_key text null,
  finalized_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_attempts_owner_check check (
    (student_id is not null and guest_session_hash is null) or
    (student_id is null and guest_session_hash is not null and char_length(trim(guest_session_hash)) = 64)
  ),
  constraint exam_attempts_final_check check (
    (status = 'in_progress' and submitted_at is null and submit_reason is null and score is null and finalized_at is null) or
    (status <> 'in_progress' and submitted_at is not null and submit_reason is not null and finalized_at is not null)
  )
);

create trigger exam_attempts_set_updated_at before update on public.exam_attempts for each row execute function public.set_updated_at();

-- Partial unique indexes: only one active attempt per owner per exam
create unique index exam_attempts_student_active_unique on public.exam_attempts (student_id, exam_id) where status = 'in_progress' and student_id is not null;
create unique index exam_attempts_guest_active_unique on public.exam_attempts (guest_session_hash, exam_id) where status = 'in_progress' and guest_session_hash is not null;

create index exam_attempts_student_idx on public.exam_attempts (student_id, created_at desc);
create index exam_attempts_guest_idx on public.exam_attempts (guest_session_hash, created_at desc);
create index exam_attempts_exam_status_idx on public.exam_attempts (exam_id, status);
create index exam_attempts_deadline_idx on public.exam_attempts (deadline_at) where status = 'in_progress';

-- 2. attempt_answers
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option_id uuid null references public.question_options(id),
  is_marked boolean not null default false,
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_answers_attempt_question_unique unique (attempt_id, question_id),
  constraint attempt_answers_composite_option_fk foreign key (question_id, selected_option_id) references public.question_options(question_id, id)
);

create trigger attempt_answers_set_updated_at before update on public.attempt_answers for each row execute function public.set_updated_at();

create index attempt_answers_attempt_idx on public.attempt_answers (attempt_id);
create index attempt_answers_question_idx on public.attempt_answers (question_id);

-- 3. exam_events
create table public.exam_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  event_type public.exam_event_type not null,
  client_occurred_at timestamptz null,
  server_occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz null
);

create index exam_events_attempt_server_time_idx on public.exam_events (attempt_id, server_occurred_at);
create index exam_events_type_server_time_idx on public.exam_events (event_type, server_occurred_at);

-- RLS
alter table public.exam_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.exam_events enable row level security;

grant usage on type public.attempt_status to anon, authenticated, service_role;
grant usage on type public.submit_reason to anon, authenticated, service_role;
grant usage on type public.exam_event_type to anon, authenticated, service_role;

grant select, insert, update on public.exam_attempts to anon, authenticated;
grant select, insert, update on public.attempt_answers to anon, authenticated;
grant select, insert on public.exam_events to anon, authenticated;
grant all on public.exam_attempts, public.attempt_answers, public.exam_events to service_role;

-- RLS Policies
create policy "Students can read own attempts" on public.exam_attempts for select to authenticated
using (student_id = auth.uid() or public.is_admin());

create policy "Admins can manage all attempts" on public.exam_attempts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Students can read own answers" on public.attempt_answers for select to authenticated
using (exists (select 1 from public.exam_attempts a where a.id = attempt_answers.attempt_id and (a.student_id = auth.uid() or public.is_admin())));

create policy "Admins can manage all answers" on public.attempt_answers for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Students can read own events" on public.exam_events for select to authenticated
using (exists (select 1 from public.exam_attempts a where a.id = exam_events.attempt_id and (a.student_id = auth.uid() or public.is_admin())));

-- ============================================================================
-- ENGINE RPCs (DEFINER Security to safely handle guest tokens & transactional integrity)
-- ============================================================================

-- Helper: Verify ownership of attempt
create function public.verify_attempt_owner(p_attempt public.exam_attempts, p_guest_session_hash text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if p_attempt.student_id is not null then
    return (auth.uid() is not null and auth.uid() = p_attempt.student_id) or public.is_admin();
  elsif p_attempt.guest_session_hash is not null then
    return p_guest_session_hash is not null and p_guest_session_hash = p_attempt.guest_session_hash;
  end if;
  return false;
end;
$$;

-- 1. RPC: start_attempt
create function public.start_attempt(p_exam_id uuid, p_guest_session_hash text default null)
returns table (
  attempt_id uuid,
  started_at timestamptz,
  deadline_at timestamptz,
  attempt_status public.attempt_status,
  is_existing boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_exam public.exams;
  current_student_id uuid := null;
  active_attempt public.exam_attempts;
  new_attempt_id uuid;
  calc_deadline timestamptz;
  now_ts timestamptz := now();
begin
  -- Validate user/auth
  if auth.uid() is not null then
    select id into current_student_id
    from public.profiles
    where id = auth.uid() and role = 'student' and status = 'active';

    if current_student_id is null and not public.is_admin() then
      raise exception using errcode = 'P0001', message = 'STUDENT_ACCOUNT_LOCKED_OR_INVALID';
    end if;
  end if;

  -- Validate target exam
  select * into target_exam from public.exams where id = p_exam_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0001', message = 'EXAM_NOT_FOUND';
  end if;

  if target_exam.status <> 'published' then
    raise exception using errcode = 'P0001', message = 'EXAM_NOT_PUBLISHED';
  end if;

  if target_exam.access_type = 'students_only' and current_student_id is null then
    raise exception using errcode = 'P0001', message = 'LOGIN_REQUIRED';
  end if;

  if current_student_id is null then
    if not target_exam.allow_guest_attempt or target_exam.access_type <> 'public' then
      raise exception using errcode = 'P0001', message = 'GUEST_ATTEMPT_NOT_ALLOWED';
    end if;

    if p_guest_session_hash is null or char_length(trim(p_guest_session_hash)) <> 64 then
      raise exception using errcode = 'P0001', message = 'INVALID_GUEST_TOKEN';
    end if;
  end if;

  -- Check existing active attempt for this owner & exam
  if current_student_id is not null then
    select * into active_attempt
    from public.exam_attempts a
    where a.exam_id = p_exam_id and a.student_id = current_student_id and a.status = 'in_progress'
    for update;
  else
    select * into active_attempt
    from public.exam_attempts a
    where a.exam_id = p_exam_id and a.guest_session_hash = p_guest_session_hash and a.status = 'in_progress'
    for update;
  end if;

  if found then
    -- Check if existing attempt reached deadline
    if now_ts >= active_attempt.deadline_at then
      -- Auto submit expired attempt
      perform public.submit_attempt(
        active_attempt.id,
        p_guest_session_hash,
        null,
        'time_expired'
      );
    else
      -- Return existing active attempt using output assignments
      attempt_id := active_attempt.id;
      started_at := active_attempt.started_at;
      deadline_at := active_attempt.deadline_at;
      attempt_status := active_attempt.status;
      is_existing := true;
      return next;
      return;
    end if;
  end if;

  -- Create new attempt
  calc_deadline := now_ts + (target_exam.duration_minutes || ' minutes')::interval;

  insert into public.exam_attempts (
    exam_id,
    student_id,
    guest_session_hash,
    status,
    started_at,
    deadline_at
  ) values (
    p_exam_id,
    current_student_id,
    case when current_student_id is null then p_guest_session_hash else null end,
    'in_progress',
    now_ts,
    calc_deadline
  ) returning id into new_attempt_id;

  -- Log event
  insert into public.exam_events (attempt_id, event_type, metadata)
  values (new_attempt_id, 'attempt_started', jsonb_build_object('exam_id', p_exam_id));

  attempt_id := new_attempt_id;
  started_at := now_ts;
  deadline_at := calc_deadline;
  attempt_status := 'in_progress';
  is_existing := false;
  return next;
  return;
end;
$$;

-- 2. RPC: get_attempt_payload
create function public.get_attempt_payload(p_attempt_id uuid, p_guest_session_hash text default null)
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

-- 3. RPC: save_answer
create function public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid default null,
  p_is_marked boolean default false,
  p_guest_session_hash text default null
)
returns table (success boolean, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  now_ts timestamptz := now();
  q_valid boolean;
  o_valid boolean;
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id for update;
  if not found then
    success := false; code := 'ATTEMPT_NOT_FOUND'; return next; return;
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    success := false; code := 'FORBIDDEN_ATTEMPT_ACCESS'; return next; return;
  end if;

  if target_attempt.status <> 'in_progress' then
    success := false; code := 'ATTEMPT_ALREADY_FINALIZED'; return next; return;
  end if;

  if now_ts >= target_attempt.deadline_at then
    perform public.submit_attempt(p_attempt_id, p_guest_session_hash, null, 'time_expired');
    success := false; code := 'ATTEMPT_EXPIRED'; return next; return;
  end if;

  -- Validate question belongs to the exam of attempt
  select exists (
    select 1
    from public.questions q
    join public.exam_sections s on s.id = q.section_id
    where q.id = p_question_id
      and s.exam_id = target_attempt.exam_id
      and q.is_active and q.deleted_at is null
      and s.deleted_at is null
  ) into q_valid;

  if not q_valid then
    success := false; code := 'INVALID_QUESTION_FOR_EXAM'; return next; return;
  end if;

  -- Validate option if selected
  if p_selected_option_id is not null then
    select exists (
      select 1
      from public.question_options o
      where o.id = p_selected_option_id
        and o.question_id = p_question_id
        and o.is_active and o.deleted_at is null
    ) into o_valid;

    if not o_valid then
      success := false; code := 'INVALID_OPTION_FOR_QUESTION'; return next; return;
    end if;
  end if;

  -- Upsert answer
  insert into public.attempt_answers (
    attempt_id,
    question_id,
    selected_option_id,
    is_marked,
    answered_at
  ) values (
    p_attempt_id,
    p_question_id,
    p_selected_option_id,
    p_is_marked,
    now_ts
  )
  on conflict (attempt_id, question_id) do update set
    selected_option_id = excluded.selected_option_id,
    is_marked = excluded.is_marked,
    answered_at = excluded.answered_at;

  success := true; code := 'OK'; return next; return;
end;
$$;

-- 4. RPC: submit_attempt
create function public.submit_attempt(
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

-- 5. RPC: get_attempt_result
create function public.get_attempt_result(p_attempt_id uuid, p_guest_session_hash text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  target_exam public.exams;
  now_ts timestamptz := now();
  questions_detail jsonb := null;
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_FOUND';
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ATTEMPT_ACCESS';
  end if;

  -- Auto submit if expired
  if target_attempt.status = 'in_progress' and now_ts >= target_attempt.deadline_at then
    perform public.submit_attempt(p_attempt_id, p_guest_session_hash, null, 'time_expired');
    select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id;
  end if;

  if target_attempt.status = 'in_progress' then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_STILL_IN_PROGRESS';
  end if;

  select * into target_exam from public.exams e where e.id = target_attempt.exam_id;

  -- If show_answers_after_submit or show_solutions_after_submit is enabled, build question details
  if target_exam.show_answers_after_submit or target_exam.show_solutions_after_submit then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'content', q.content,
        'image_path', q.image_path,
        'explanation', case when target_exam.show_solutions_after_submit then q.explanation else null end,
        'score', q.score,
        'position', q.position,
        'selected_option_id', a.selected_option_id,
        'correct_option_id', (
          select id from public.question_options o where o.question_id = q.id and o.is_correct and o.is_active and o.deleted_at is null limit 1
        ),
        'options', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'content', o.content,
              'position', o.position,
              'is_correct', case when target_exam.show_answers_after_submit then o.is_correct else null end
            ) order by o.position
          ), '[]'::jsonb)
          from public.question_options o
          where o.question_id = q.id and o.is_active and o.deleted_at is null
        )
      ) order by s.position, q.position
    ), '[]'::jsonb) into questions_detail
    from public.exam_sections s
    join public.questions q on q.section_id = s.id and q.is_active and q.deleted_at is null
    left join public.attempt_answers a on a.attempt_id = p_attempt_id and a.question_id = q.id
    where s.exam_id = target_exam.id and s.deleted_at is null;
  end if;

  return jsonb_build_object(
    'attempt_id', target_attempt.id,
    'exam_id', target_exam.id,
    'exam_title', target_exam.title,
    'status', target_attempt.status,
    'submit_reason', target_attempt.submit_reason,
    'started_at', target_attempt.started_at,
    'submitted_at', target_attempt.submitted_at,
    'duration_minutes', target_exam.duration_minutes,
    'show_score_after_submit', target_exam.show_score_after_submit,
    'show_answers_after_submit', target_exam.show_answers_after_submit,
    'show_solutions_after_submit', target_exam.show_solutions_after_submit,
    'score', case when target_exam.show_score_after_submit then target_attempt.score else null end,
    'max_score', case when target_exam.show_score_after_submit then target_attempt.max_score else null end,
    'correct_answers', case when target_exam.show_score_after_submit then target_attempt.correct_answers else null end,
    'wrong_answers', case when target_exam.show_score_after_submit then target_attempt.wrong_answers else null end,
    'blank_answers', case when target_exam.show_score_after_submit then target_attempt.blank_answers else null end,
    'questions_detail', questions_detail
  );
end;
$$;

grant execute on function public.start_attempt(uuid, text) to anon, authenticated;
grant execute on function public.get_attempt_payload(uuid, text) to anon, authenticated;
grant execute on function public.save_answer(uuid, uuid, uuid, boolean, text) to anon, authenticated;
grant execute on function public.submit_attempt(uuid, text, text, public.submit_reason) to anon, authenticated;
grant execute on function public.get_attempt_result(uuid, text) to anon, authenticated;
