-- Migration 20260809110000_admin_student_management.sql
-- Phase 10 - Step 1: Admin Student Management RPCs (Search, Filter, Lock/Unlock with Auto-Submit)

-- 1. RPC: get_admin_students
-- Returns paginated student profiles with joined email from auth.users
create or replace function public.get_admin_students(
  p_search text default null,
  p_status text default 'all',
  p_page integer default 1,
  p_page_size integer default 10
)
returns table (
  id uuid,
  display_name text,
  email text,
  status public.profile_status,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset integer;
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required' using errcode = '42501';
  end if;

  v_offset := (greatest(1, p_page) - 1) * p_page_size;

  -- Get total count matching criteria
  select count(*) into v_total
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'student'
    and (p_status is null or p_status = 'all' or p.status::text = p_status)
    and (
      p_search is null or trim(p_search) = ''
      or p.display_name ilike '%' || trim(p_search) || '%'
      or u.email ilike '%' || trim(p_search) || '%'
    );

  return query
  select
    p.id,
    p.display_name,
    u.email::text,
    p.status,
    p.created_at,
    v_total as total_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'student'
    and (p_status is null or p_status = 'all' or p.status::text = p_status)
    and (
      p_search is null or trim(p_search) = ''
      or p.display_name ilike '%' || trim(p_search) || '%'
      or u.email ilike '%' || trim(p_search) || '%'
    )
  order by p.created_at desc
  limit p_page_size offset v_offset;
end;
$$;

grant execute on function public.get_admin_students(text, text, integer, integer) to authenticated, service_role;

-- 2. RPC: toggle_student_lock
-- Atomically lock or unlock a student account.
-- When locking: auto-submits all in_progress attempts of the student with submit_reason = 'account_locked' and logs account_locked audit event.
create or replace function public.toggle_student_lock(
  p_student_id uuid,
  p_target_status text
)
returns table (
  success boolean,
  code text,
  status public.profile_status,
  attempts_auto_submitted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles;
  att_rec record;
  submitted_count integer := 0;
begin
  if not public.is_admin() then
    success := false; code := 'FORBIDDEN_ADMIN_REQUIRED'; status := null; attempts_auto_submitted := 0; return next; return;
  end if;

  if p_target_status not in ('active', 'locked') then
    success := false; code := 'INVALID_STATUS'; status := null; attempts_auto_submitted := 0; return next; return;
  end if;

  select * into target_profile from public.profiles p where p.id = p_student_id for update;
  if not found then
    success := false; code := 'STUDENT_NOT_FOUND'; status := null; attempts_auto_submitted := 0; return next; return;
  end if;

  if target_profile.role <> 'student' then
    success := false; code := 'INVALID_ROLE'; status := null; attempts_auto_submitted := 0; return next; return;
  end if;

  if p_target_status = 'locked' then
    -- Lock student account
    update public.profiles set status = 'locked'::public.profile_status where id = p_student_id;

    -- Auto-submit all in_progress attempts for this student
    for att_rec in
      select a.id
      from public.exam_attempts a
      where a.student_id = p_student_id and a.status = 'in_progress'
      for update of a
    loop
      perform public.submit_attempt(att_rec.id, null, null, 'account_locked');

      -- Record account_locked event in exam_events if not already present
      if not exists (
        select 1 from public.exam_events
        where attempt_id = att_rec.id and event_type = 'account_locked'
      ) then
        insert into public.exam_events (attempt_id, event_type, metadata)
        values (
          att_rec.id,
          'account_locked'::public.exam_event_type,
          jsonb_build_object('reason', 'account_locked', 'locked_by_admin', auth.uid())
        );
      end if;

      submitted_count := submitted_count + 1;
    end loop;

    success := true; code := 'LOCKED_SUCCESSFULLY'; status := 'locked'::public.profile_status; attempts_auto_submitted := submitted_count; return next; return;
  else
    -- Unlock student account
    update public.profiles set status = 'active'::public.profile_status where id = p_student_id;
    success := true; code := 'UNLOCKED_SUCCESSFULLY'; status := 'active'::public.profile_status; attempts_auto_submitted := 0; return next; return;
  end if;
end;
$$;

grant execute on function public.toggle_student_lock(uuid, text) to authenticated, service_role;
