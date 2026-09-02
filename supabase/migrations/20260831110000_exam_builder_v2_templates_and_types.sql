-- Migration: Exam Builder V2 - Templates, Question Types, and Extensible Scoring Engine

-- 1. Alter public.exams
alter table public.exams
  add column if not exists exam_template text not null default 'custom',
  add column if not exists scoring_strategy text not null default 'standard';

-- 2. Alter public.questions
alter table public.questions
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists correct_answer_raw text null,
  add column if not exists tolerance numeric(10,4) null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. Alter public.attempt_answers
alter table public.attempt_answers
  add column if not exists text_answer text null,
  add column if not exists sub_answers jsonb null;

-- 4. Update assert_exam_draft_for_content trigger function
create or replace function public.assert_exam_draft_for_content()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status public.exam_status;
  parent_deleted_at timestamptz;
begin
  -- Cho phép cập nhật deleted_at (xóa mềm hoặc phục hồi nội dung)
  if (tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at) then
    return new;
  end if;

  if tg_table_name = 'exam_sections' then
    select status, deleted_at into parent_status, parent_deleted_at from public.exams where id = coalesce(new.exam_id, old.exam_id);
  elsif tg_table_name = 'questions' then
    select e.status, e.deleted_at into parent_status, parent_deleted_at
    from public.exam_sections s join public.exams e on e.id = s.exam_id
    where s.id = coalesce(new.section_id, old.section_id) and s.deleted_at is null;
  else
    select e.status, e.deleted_at into parent_status, parent_deleted_at
    from public.questions q
    join public.exam_sections s on s.id = q.section_id
    join public.exams e on e.id = s.exam_id
    where q.id = coalesce(new.question_id, old.question_id)
      and q.deleted_at is null and s.deleted_at is null
    limit 1;
  end if;

  if parent_status is distinct from 'draft' or parent_deleted_at is not null then
    raise exception using errcode = 'P0001', message = 'EXAM_CONTENT_LOCKED';
  end if;

  return coalesce(new, old);
end;
$$;

-- 5. Update publish_exam
create or replace function public.publish_exam(exam_id uuid)
returns table (success boolean, code text, published_exam_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.exams;
  computed_score numeric(10,2);
  invalid_code text;
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED', exam_id; return; end if;
  select * into target from public.exams where id = exam_id for update;
  if not found or target.deleted_at is not null then return query select false, 'EXAM_NOT_FOUND', exam_id; return; end if;
  if target.status <> 'draft' then return query select false, 'EXAM_NOT_DRAFT', exam_id; return; end if;
  if target.duration_minutes not between 1 and 300 then return query select false, 'INVALID_DURATION', exam_id; return; end if;
  if target.allow_guest_attempt and target.access_type <> 'public' then return query select false, 'INVALID_GUEST_ACCESS', exam_id; return; end if;
  if target.randomize_questions or target.randomize_options then return query select false, 'RANDOMIZATION_NOT_SUPPORTED', exam_id; return; end if;
  if not exists (select 1 from public.subjects where id = target.subject_id and is_active and deleted_at is null) then return query select false, 'SUBJECT_INACTIVE', exam_id; return; end if;
  if target.category_id is not null and not exists (select 1 from public.exam_categories where id = target.category_id and is_active and deleted_at is null) then return query select false, 'CATEGORY_INACTIVE', exam_id; return; end if;
  if not exists (select 1 from public.exam_sections where exam_sections.exam_id = target.id and deleted_at is null) then return query select false, 'EXAM_HAS_NO_SECTION', exam_id; return; end if;

  select case
    when exists (
      select 1 from public.exam_sections s
      where s.exam_id = target.id and s.deleted_at is null
        and not exists (select 1 from public.questions q where q.section_id = s.id and q.is_active and q.deleted_at is null)
    ) then 'SECTION_HAS_NO_QUESTION'

    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null and q.score <= 0
    ) then 'QUESTION_INVALID_SCORE'

    -- Check multiple_choice
    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null
        and coalesce(q.question_type, 'multiple_choice') in ('multiple_choice', 'regular')
        and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active and o.deleted_at is null) < 2
    ) then 'QUESTION_HAS_TOO_FEW_OPTIONS'

    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null
        and coalesce(q.question_type, 'multiple_choice') in ('multiple_choice', 'regular')
        and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active and o.deleted_at is null and o.is_correct) <> 1
    ) then 'QUESTION_INVALID_CORRECT_OPTION_COUNT'

    -- Check true_false_group
    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null
        and q.question_type = 'true_false_group'
        and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active and o.deleted_at is null) < 2
    ) then 'TRUE_FALSE_GROUP_HAS_TOO_FEW_STATEMENTS'

    -- Check short_answer
    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null
        and q.question_type = 'short_answer'
        and (q.correct_answer_raw is null or char_length(trim(q.correct_answer_raw)) = 0)
    ) then 'SHORT_ANSWER_MISSING_CORRECT_VALUE'

    else null
  end into invalid_code;

  if invalid_code is not null then return query select false, invalid_code, exam_id; return; end if;

  select coalesce(sum(q.score), 0)::numeric(10,2) into computed_score
  from public.questions q join public.exam_sections s on s.id = q.section_id
  where s.exam_id = target.id and s.deleted_at is null and q.is_active and q.deleted_at is null;

  update public.exams set status = 'published', published_at = now(), total_score = computed_score, updated_by = auth.uid()
  where id = target.id;
  return query select true, 'OK', target.id;
end;
$$;

-- 6. Update clone_exam
create or replace function public.clone_exam(source_exam_id uuid, new_title text, new_slug text)
returns table (success boolean, code text, cloned_exam_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  source public.exams;
  clone_id uuid;
  section_pair record;
  question_pair record;
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED', null::uuid; return; end if;
  if char_length(trim(new_title)) < 2 or new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return query select false, 'INVALID_CLONE_INPUT', null::uuid; return;
  end if;
  select * into source from public.exams where id = source_exam_id and deleted_at is null;
  if not found then return query select false, 'EXAM_NOT_FOUND', null::uuid; return; end if;

  insert into public.exams (
    subject_id, category_id, title, slug, description, status, access_type, allow_guest_attempt,
    fullscreen_required, duration_minutes, total_score, randomize_questions, randomize_options,
    show_score_after_submit, show_answers_after_submit, show_solutions_after_submit,
    exam_template, scoring_strategy, created_by, updated_by
  ) values (
    source.subject_id, source.category_id, trim(new_title), lower(new_slug), source.description, 'draft',
    source.access_type, source.allow_guest_attempt, source.fullscreen_required, source.duration_minutes,
    source.total_score, false, false, source.show_score_after_submit, source.show_answers_after_submit,
    source.show_solutions_after_submit, source.exam_template, source.scoring_strategy, auth.uid(), auth.uid()
  ) returning id into clone_id;

  create temp table tmp_section_map(old_id uuid primary key, new_id uuid not null) on commit drop;
  create temp table tmp_question_map(old_id uuid primary key, new_id uuid not null) on commit drop;

  for section_pair in
    insert into public.exam_sections (exam_id, title, description, position)
    select clone_id, title, description, position from public.exam_sections
    where exam_id = source_exam_id and deleted_at is null order by position
    returning id, title, position
  loop
    insert into tmp_section_map(old_id, new_id)
    select s.id, section_pair.id from public.exam_sections s
    where s.exam_id = source_exam_id and s.title = section_pair.title and s.position = section_pair.position and s.deleted_at is null
    limit 1;
  end loop;

  for question_pair in
    select q.*, m.new_id from public.questions q join tmp_section_map m on m.old_id = q.section_id
    where q.deleted_at is null order by q.position
  loop
    insert into public.questions (
      section_id, content, image_path, explanation, score, position, is_active,
      question_type, correct_answer_raw, tolerance, metadata
    )
    values (
      question_pair.new_id, question_pair.content, question_pair.image_path, question_pair.explanation,
      question_pair.score, question_pair.position, question_pair.is_active,
      question_pair.question_type, question_pair.correct_answer_raw, question_pair.tolerance, question_pair.metadata
    )
    returning id into section_pair;
    insert into tmp_question_map(old_id, new_id) values (question_pair.id, section_pair.id);
  end loop;

  insert into public.question_options (question_id, content, position, is_correct, is_active)
  select m.new_id, o.content, o.position, o.is_correct, o.is_active
  from public.question_options o join tmp_question_map m on m.old_id = o.question_id
  where o.deleted_at is null order by o.position;

  return query select true, 'OK', clone_id;
exception when unique_violation then
  return query select false, 'CLONE_SLUG_NOT_UNIQUE', null::uuid;
end;
$$;

-- 7. Update get_attempt_payload
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
            'question_type', q.question_type,
            'tolerance', q.tolerance,
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
      'text_answer', a.text_answer,
      'sub_answers', a.sub_answers,
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
    'exam_template', target_exam.exam_template,
    'scoring_strategy', target_exam.scoring_strategy,
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

-- 8. Update save_answer
drop function if exists public.save_answer(uuid, uuid, uuid, boolean, text);
drop function if exists public.save_answer(uuid, uuid, uuid, boolean, text, text, jsonb);

create or replace function public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid default null,
  p_is_marked boolean default false,
  p_guest_session_hash text default null,
  p_text_answer text default null,
  p_sub_answers jsonb default null
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
    text_answer,
    sub_answers,
    is_marked,
    answered_at
  ) values (
    p_attempt_id,
    p_question_id,
    p_selected_option_id,
    p_text_answer,
    p_sub_answers,
    p_is_marked,
    now_ts
  )
  on conflict (attempt_id, question_id) do update set
    selected_option_id = excluded.selected_option_id,
    text_answer = excluded.text_answer,
    sub_answers = excluded.sub_answers,
    is_marked = excluded.is_marked,
    answered_at = excluded.answered_at;

  success := true; code := 'OK'; return next; return;
end;
$$;

-- Helper function: evaluate numerical & fraction equality in SQL
create or replace function public.math_value_equals(p_raw1 text, p_raw2 text, p_tolerance numeric default 0)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v1 numeric;
  v2 numeric;
  s1 text := trim(replace(replace(coalesce(p_raw1, ''), ' ', ''), ',', '.'));
  s2 text := trim(replace(replace(coalesce(p_raw2, ''), ' ', ''), ',', '.'));
  parts1 text[];
  parts2 text[];
  tol numeric := coalesce(p_tolerance, 0);
begin
  if s1 = '' or s2 = '' then return false; end if;
  if lower(s1) = lower(s2) then return true; end if;

  -- Parse s1 fraction
  if s1 ~ '^-?[0-9]+/-?[0-9]+$' then
    parts1 := string_to_array(s1, '/');
    if parts1[2]::numeric = 0 then return false; end if;
    v1 := parts1[1]::numeric / parts1[2]::numeric;
  elsif s1 ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v1 := s1::numeric;
  else
    return false;
  end if;

  -- Parse s2 fraction
  if s2 ~ '^-?[0-9]+/-?[0-9]+$' then
    parts2 := string_to_array(s2, '/');
    if parts2[2]::numeric = 0 then return false; end if;
    v2 := parts2[1]::numeric / parts2[2]::numeric;
  elsif s2 ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v2 := s2::numeric;
  else
    return false;
  end if;

  if tol < 0.000001 then tol := 0.000001; end if;
  return abs(v1 - v2) <= tol;
exception when others then
  return lower(s1) = lower(s2);
end;
$$;

-- 9. Update submit_attempt
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
  opt_record record;
  user_ans record;
  computed_score numeric(10,2) := 0;
  cnt_correct integer := 0;
  cnt_wrong integer := 0;
  cnt_blank integer := 0;
  
  -- variables for question scoring
  q_type text;
  q_score numeric(10,2);
  tf_correct_count integer;
  tf_total_count integer;
  tf_question_score numeric(10,2);
  user_bool boolean;
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

  -- Server-side scoring calculation across all question types
  for q_record in
    select
      q.id as question_id,
      q.score as question_score,
      coalesce(q.question_type, 'multiple_choice') as question_type,
      q.correct_answer_raw,
      q.tolerance
    from public.questions q
    join public.exam_sections s on s.id = q.section_id
    where s.exam_id = target_exam.id and s.deleted_at is null and q.is_active and q.deleted_at is null
    order by s.position, q.position
  loop
    q_type := q_record.question_type;
    q_score := q_record.question_score;

    select * into user_ans
    from public.attempt_answers a
    where a.attempt_id = p_attempt_id and a.question_id = q_record.question_id;

    if q_type in ('multiple_choice', 'regular') then
      -- Multiple choice evaluation
      if user_ans.selected_option_id is null then
        cnt_blank := cnt_blank + 1;
      else
        if exists (
          select 1 from public.question_options o
          where o.id = user_ans.selected_option_id and o.is_correct = true and o.is_active and o.deleted_at is null
        ) then
          cnt_correct := cnt_correct + 1;
          computed_score := computed_score + q_score;
        else
          cnt_wrong := cnt_wrong + 1;
        end if;
      end if;

    elsif q_type = 'short_answer' then
      -- Short answer evaluation
      if user_ans.text_answer is null or char_length(trim(user_ans.text_answer)) = 0 then
        cnt_blank := cnt_blank + 1;
      else
        if public.math_value_equals(user_ans.text_answer, q_record.correct_answer_raw, q_record.tolerance) then
          cnt_correct := cnt_correct + 1;
          computed_score := computed_score + q_score;
        else
          cnt_wrong := cnt_wrong + 1;
        end if;
      end if;

    elsif q_type = 'true_false_group' then
      -- True/False Group evaluation (4 statements)
      if user_ans.sub_answers is null or user_ans.sub_answers = '{}'::jsonb then
        cnt_blank := cnt_blank + 1;
      else
        tf_correct_count := 0;
        tf_total_count := 0;

        for opt_record in
          select o.id, o.is_correct
          from public.question_options o
          where o.question_id = q_record.question_id and o.is_active and o.deleted_at is null
          order by o.position
        loop
          tf_total_count := tf_total_count + 1;
          if (user_ans.sub_answers->>opt_record.id::text) is not null then
            user_bool := (user_ans.sub_answers->>opt_record.id::text)::boolean;
            if user_bool = opt_record.is_correct then
              tf_correct_count := tf_correct_count + 1;
            end if;
          end if;
        end loop;

        -- Apply THPT 2026 scoring rule:
        -- 1 statement correct: 0.10
        -- 2 statements correct: 0.25
        -- 3 statements correct: 0.50
        -- 4 statements correct: 1.00
        -- 0 correct: 0.00
        if tf_correct_count = 4 then
          tf_question_score := 1.00;
          cnt_correct := cnt_correct + 1;
        elsif tf_correct_count = 3 then
          tf_question_score := 0.50;
          cnt_wrong := cnt_wrong + 1;
        elsif tf_correct_count = 2 then
          tf_question_score := 0.25;
          cnt_wrong := cnt_wrong + 1;
        elsif tf_correct_count = 1 then
          tf_question_score := 0.10;
          cnt_wrong := cnt_wrong + 1;
        else
          tf_question_score := 0.00;
          cnt_wrong := cnt_wrong + 1;
        end if;

        -- Scale score if question has custom score weight
        if q_score <> 1.00 and q_score > 0 then
          tf_question_score := tf_question_score * q_score;
        end if;

        computed_score := computed_score + tf_question_score;
      end if;

    else
      -- Default fallback
      if user_ans.selected_option_id is null and (user_ans.text_answer is null or char_length(trim(user_ans.text_answer)) = 0) then
        cnt_blank := cnt_blank + 1;
      else
        cnt_wrong := cnt_wrong + 1;
      end if;
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

-- 10. Update get_attempt_result
create or replace function public.get_attempt_result(p_attempt_id uuid, p_guest_session_hash text default null)
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

  -- Build questions detail
  if target_exam.show_answers_after_submit or target_exam.show_solutions_after_submit then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'content', q.content,
        'image_path', q.image_path,
        'explanation', case when target_exam.show_solutions_after_submit then q.explanation else null end,
        'score', q.score,
        'position', q.position,
        'question_type', q.question_type,
        'correct_answer_raw', case when target_exam.show_answers_after_submit then q.correct_answer_raw else null end,
        'tolerance', q.tolerance,
        'selected_option_id', a.selected_option_id,
        'text_answer', a.text_answer,
        'sub_answers', a.sub_answers,
        'is_correct', case
          when q.question_type = 'short_answer' then public.math_value_equals(a.text_answer, q.correct_answer_raw, q.tolerance)
          when q.question_type = 'true_false_group' then null
          else coalesce(a.selected_option_id = (
            select id from public.question_options o where o.question_id = q.id and o.is_correct and o.is_active and o.deleted_at is null limit 1
          ), false)
        end,
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
    'is_guest', (target_attempt.student_id is null),
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

-- 11. Update get_admin_attempt_detail
create or replace function public.get_admin_attempt_detail(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_exam record;
  v_subject record;
  v_category_name text := null;
  v_student_display_name text := 'Khách';
  v_student_email text := null;
  v_questions jsonb;
  v_events jsonb;
  v_res jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ADMIN_REQUIRED';
  end if;

  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id;

  if v_attempt.id is null then
    return null;
  end if;

  select * into v_exam
  from public.exams
  where id = v_attempt.exam_id;

  select * into v_subject
  from public.subjects
  where id = v_exam.subject_id;

  if v_exam.category_id is not null then
    select name into v_category_name
    from public.exam_categories
    where id = v_exam.category_id;
  end if;

  if v_attempt.student_id is not null then
    select coalesce(display_name, 'Học sinh') into v_student_display_name
    from public.profiles
    where id = v_attempt.student_id;

    select email into v_student_email
    from auth.users
    where id = v_attempt.student_id;
  end if;

  -- Questions & answers details
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'content', q.content,
        'image_path', q.image_path,
        'explanation', q.explanation,
        'score', q.score,
        'position', q.position,
        'question_type', q.question_type,
        'correct_answer_raw', q.correct_answer_raw,
        'tolerance', q.tolerance,
        'selected_option_id', aa.selected_option_id,
        'text_answer', aa.text_answer,
        'sub_answers', aa.sub_answers,
        'selected_option_content', sel_opt.content,
        'correct_option_id', corr_opt.id,
        'correct_option_content', corr_opt.content,
        'is_correct', case
          when q.question_type = 'short_answer' then public.math_value_equals(aa.text_answer, q.correct_answer_raw, q.tolerance)
          when q.question_type = 'true_false_group' then null
          else coalesce(aa.selected_option_id = corr_opt.id, false)
        end,
        'options', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', opt.id,
                'content', opt.content,
                'position', opt.position,
                'is_correct', opt.is_correct
              ) order by opt.position asc
            ),
            '[]'::jsonb
          )
          from public.question_options opt
          where opt.question_id = q.id
        )
      ) order by s.position asc, q.position asc
    ),
    '[]'::jsonb
  ) into v_questions
  from public.exam_sections s
  join public.questions q on q.section_id = s.id
  left join public.attempt_answers aa on aa.attempt_id = v_attempt.id and aa.question_id = q.id
  left join public.question_options sel_opt on sel_opt.id = aa.selected_option_id
  left join public.question_options corr_opt on corr_opt.question_id = q.id and corr_opt.is_correct = true
  where s.exam_id = v_exam.id;

  -- Event logs
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ev.id,
        'event_type', ev.event_type,
        'client_occurred_at', ev.client_occurred_at,
        'server_occurred_at', ev.server_occurred_at,
        'metadata', ev.metadata,
        'resolved_at', ev.resolved_at
      ) order by ev.server_occurred_at asc
    ),
    '[]'::jsonb
  ) into v_events
  from public.exam_events ev
  where ev.attempt_id = v_attempt.id;

  v_res := jsonb_build_object(
    'attempt_id', v_attempt.id,
    'exam_id', v_exam.id,
    'exam_title', v_exam.title,
    'subject_id', v_subject.id,
    'subject_name', v_subject.name,
    'category_id', v_exam.category_id,
    'category_name', v_category_name,
    'student_id', v_attempt.student_id,
    'student_name', v_student_display_name,
    'student_email', v_student_email,
    'is_guest', (v_attempt.student_id is null),
    'status', v_attempt.status,
    'submit_reason', v_attempt.submit_reason,
    'score', v_attempt.score,
    'max_score', v_attempt.max_score,
    'correct_answers', v_attempt.correct_answers,
    'wrong_answers', v_attempt.wrong_answers,
    'blank_answers', v_attempt.blank_answers,
    'started_at', v_attempt.started_at,
    'deadline_at', v_attempt.deadline_at,
    'submitted_at', v_attempt.submitted_at,
    'finalized_at', v_attempt.finalized_at,
    'duration_minutes', v_exam.duration_minutes,
    'exam_template', v_exam.exam_template,
    'scoring_strategy', v_exam.scoring_strategy,
    'questions_detail', v_questions,
    'events_log', v_events
  );

  return v_res;
end;
$$;

grant execute on function public.start_attempt(uuid, text) to anon, authenticated;
grant execute on function public.get_attempt_payload(uuid, text) to anon, authenticated;
grant execute on function public.save_answer(uuid, uuid, uuid, boolean, text, text, jsonb) to anon, authenticated;
grant execute on function public.submit_attempt(uuid, text, text, public.submit_reason) to anon, authenticated;
grant execute on function public.get_attempt_result(uuid, text) to anon, authenticated;
grant execute on function public.get_admin_attempt_detail(uuid) to authenticated;

