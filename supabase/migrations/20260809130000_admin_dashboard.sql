-- Phase 10 Step 3: Admin Dashboard Overview & Real Data RPCs

-- 1. RPC: get_admin_dashboard_stats
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_students bigint := 0;
  v_active_students bigint := 0;
  v_locked_students bigint := 0;

  v_total_subjects bigint := 0;

  v_total_exams bigint := 0;
  v_published_exams bigint := 0;
  v_draft_exams bigint := 0;
  v_closed_exams bigint := 0;
  v_archived_exams bigint := 0;

  v_total_attempts bigint := 0;
  v_submitted_attempts bigint := 0;
  v_auto_submitted_attempts bigint := 0;
  v_in_progress_attempts bigint := 0;
  v_expired_attempts bigint := 0;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ADMIN_REQUIRED';
  end if;

  -- 1. Student stats
  select
    count(*),
    count(*) filter (where status = 'active'),
    count(*) filter (where status = 'locked')
  into
    v_total_students,
    v_active_students,
    v_locked_students
  from public.profiles
  where role = 'student';

  -- 2. Subject stats
  select count(*)
  into v_total_subjects
  from public.subjects
  where deleted_at is null;

  -- 3. Exam stats
  select
    count(*),
    count(*) filter (where status = 'published'),
    count(*) filter (where status = 'draft'),
    count(*) filter (where status = 'closed'),
    count(*) filter (where status = 'archived')
  into
    v_total_exams,
    v_published_exams,
    v_draft_exams,
    v_closed_exams,
    v_archived_exams
  from public.exams
  where deleted_at is null;

  -- 4. Attempt stats
  select
    count(*),
    count(*) filter (where status = 'submitted'),
    count(*) filter (where status = 'auto_submitted'),
    count(*) filter (where status = 'in_progress'),
    count(*) filter (where status = 'expired')
  into
    v_total_attempts,
    v_submitted_attempts,
    v_auto_submitted_attempts,
    v_in_progress_attempts,
    v_expired_attempts
  from public.exam_attempts;

  return jsonb_build_object(
    'students', jsonb_build_object(
      'total', v_total_students,
      'active', v_active_students,
      'locked', v_locked_students
    ),
    'subjects', jsonb_build_object(
      'total', v_total_subjects
    ),
    'exams', jsonb_build_object(
      'total', v_total_exams,
      'published', v_published_exams,
      'draft', v_draft_exams,
      'closed', v_closed_exams,
      'archived', v_archived_exams
    ),
    'attempts', jsonb_build_object(
      'total', v_total_attempts,
      'submitted', v_submitted_attempts,
      'auto_submitted', v_auto_submitted_attempts,
      'completed', (v_submitted_attempts + v_auto_submitted_attempts),
      'in_progress', v_in_progress_attempts,
      'expired', v_expired_attempts
    )
  );
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- 2. RPC: get_admin_dashboard_events
create or replace function public.get_admin_dashboard_events(
  p_limit int default 10
)
returns table (
  event_id uuid,
  attempt_id uuid,
  event_type public.exam_event_type,
  client_occurred_at timestamptz,
  server_occurred_at timestamptz,
  metadata jsonb,
  resolved_at timestamptz,
  exam_id uuid,
  exam_title text,
  subject_name text,
  student_id uuid,
  student_name text,
  student_email text,
  is_guest boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ADMIN_REQUIRED';
  end if;

  v_limit := greatest(1, least(50, coalesce(p_limit, 10)));

  return query
  select
    ev.id as event_id,
    ev.attempt_id,
    ev.event_type,
    ev.client_occurred_at,
    ev.server_occurred_at,
    ev.metadata,
    ev.resolved_at,
    a.exam_id,
    e.title::text as exam_title,
    s.name::text as subject_name,
    a.student_id,
    coalesce(p.display_name, 'Khách')::text as student_name,
    u.email::text as student_email,
    (a.student_id is null) as is_guest
  from public.exam_events ev
  join public.exam_attempts a on a.id = ev.attempt_id
  join public.exams e on e.id = a.exam_id
  join public.subjects s on s.id = e.subject_id
  left join public.profiles p on p.id = a.student_id
  left join auth.users u on u.id = a.student_id
  order by ev.server_occurred_at desc
  limit v_limit;
end;
$$;

grant execute on function public.get_admin_dashboard_events(int) to authenticated;

-- 3. Index for fast event feed retrieval
create index if not exists idx_exam_events_server_occurred_at on public.exam_events(server_occurred_at desc);
