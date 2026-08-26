-- Phase 10 Step 2: Admin Attempt Management RPCs

-- 1. RPC: get_admin_attempts
create or replace function public.get_admin_attempts(
  p_search text default null,
  p_subject_id uuid default null,
  p_exam_id uuid default null,
  p_status text default null,
  p_submit_reason text default null,
  p_page int default 1,
  p_page_size int default 10
)
returns table (
  attempt_id uuid,
  exam_id uuid,
  exam_title text,
  subject_name text,
  student_id uuid,
  student_name text,
  student_email text,
  is_guest boolean,
  status public.attempt_status,
  submit_reason public.submit_reason,
  score numeric(10,2),
  max_score numeric(10,2),
  started_at timestamptz,
  submitted_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int;
  v_search text;
  v_page int;
  v_page_size int;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ADMIN_REQUIRED';
  end if;

  v_page := greatest(1, coalesce(p_page, 1));
  v_page_size := greatest(1, least(100, coalesce(p_page_size, 10)));
  v_offset := (v_page - 1) * v_page_size;
  v_search := nullif(trim(p_search), '');

  return query
  with filtered_attempts as (
    select
      a.id as f_attempt_id,
      a.exam_id as f_exam_id,
      e.title::text as f_exam_title,
      s.name::text as f_subject_name,
      a.student_id as f_student_id,
      coalesce(p.display_name, 'Khách')::text as f_student_name,
      u.email::text as f_student_email,
      (a.student_id is null) as f_is_guest,
      a.status as f_status,
      a.submit_reason as f_submit_reason,
      a.score as f_score,
      a.max_score as f_max_score,
      a.started_at as f_started_at,
      a.submitted_at as f_submitted_at,
      count(*) over() as f_total_count
    from public.exam_attempts a
    join public.exams e on e.id = a.exam_id
    join public.subjects s on s.id = e.subject_id
    left join public.profiles p on p.id = a.student_id
    left join auth.users u on u.id = a.student_id
    where (
      v_search is null or (
        e.title ilike '%' || v_search || '%' or
        p.display_name ilike '%' || v_search || '%' or
        u.email ilike '%' || v_search || '%'
      )
    )
    and (p_subject_id is null or e.subject_id = p_subject_id)
    and (p_exam_id is null or a.exam_id = p_exam_id)
    and (
      p_status is null or p_status = 'all' or a.status::text = p_status
    )
    and (
      p_submit_reason is null or p_submit_reason = 'all' or a.submit_reason::text = p_submit_reason
    )
    order by a.started_at desc
    limit v_page_size
    offset v_offset
  )
  select
    fa.f_attempt_id,
    fa.f_exam_id,
    fa.f_exam_title,
    fa.f_subject_name,
    fa.f_student_id,
    fa.f_student_name,
    fa.f_student_email,
    fa.f_is_guest,
    fa.f_status,
    fa.f_submit_reason,
    fa.f_score,
    fa.f_max_score,
    fa.f_started_at,
    fa.f_submitted_at,
    fa.f_total_count
  from filtered_attempts fa;
end;
$$;

grant execute on function public.get_admin_attempts(text, uuid, uuid, text, text, int, int) to authenticated;


-- 2. RPC: get_admin_attempt_detail
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
        'selected_option_id', aa.selected_option_id,
        'selected_option_content', sel_opt.content,
        'correct_option_id', corr_opt.id,
        'correct_option_content', corr_opt.content,
        'is_correct', coalesce(aa.selected_option_id = corr_opt.id, false),
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
    'questions_detail', v_questions,
    'events_log', v_events
  );

  return v_res;
end;
$$;

grant execute on function public.get_admin_attempt_detail(uuid) to authenticated;

-- Indexes for Admin Attempts Monitoring
create index if not exists idx_exam_attempts_submit_reason on public.exam_attempts(submit_reason);
create index if not exists idx_exam_attempts_started_at_desc on public.exam_attempts(started_at desc);
