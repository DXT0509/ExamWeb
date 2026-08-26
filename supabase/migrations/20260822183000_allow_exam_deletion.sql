-- Migration: Allow deleting published/closed/draft exams and cascade soft-delete
-- 1. Update protect_exam_update() so deleted_at can be updated for non-draft exams
create or replace function public.protect_exam_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'draft' then
    if new.subject_id is distinct from old.subject_id
      or new.category_id is distinct from old.category_id
      or new.duration_minutes is distinct from old.duration_minutes
      or new.randomize_questions is distinct from old.randomize_questions
      or new.randomize_options is distinct from old.randomize_options
      or new.total_score is distinct from old.total_score then
      raise exception using errcode = 'P0001', message = 'EXAM_CONTENT_LOCKED';
    end if;
  end if;

  if new.total_score is distinct from old.total_score and new.status = old.status then
    raise exception using errcode = 'P0001', message = 'TOTAL_SCORE_SERVER_CONTROLLED';
  end if;

  return new;
end;
$$;

-- 2. Update assert_exam_draft_for_content() so soft-deleting content is allowed even if exam is published
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

-- 3. Dedicated RPC delete_exam to cascade soft delete exam, sections, questions, options and expire attempts
create or replace function public.delete_exam(p_exam_id uuid)
returns table (success boolean, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_exam public.exams;
begin
  if not public.is_admin() then
    return query select false, 'ADMIN_REQUIRED';
    return;
  end if;

  select * into target_exam from public.exams where id = p_exam_id and deleted_at is null;
  if target_exam.id is null then
    return query select false, 'EXAM_NOT_FOUND';
    return;
  end if;

  -- 1. Soft-delete options
  update public.question_options
  set deleted_at = now(), is_active = false
  where question_id in (
    select q.id from public.questions q
    join public.exam_sections s on s.id = q.section_id
    where s.exam_id = p_exam_id
  ) and deleted_at is null;

  -- 2. Soft-delete questions
  update public.questions
  set deleted_at = now(), is_active = false
  where section_id in (
    select id from public.exam_sections where exam_id = p_exam_id
  ) and deleted_at is null;

  -- 3. Soft-delete sections
  update public.exam_sections
  set deleted_at = now()
  where exam_id = p_exam_id and deleted_at is null;

  -- 4. Expire any in_progress attempts for this exam
  update public.exam_attempts
  set status = 'expired',
      submitted_at = coalesce(submitted_at, now()),
      submit_reason = 'time_expired',
      finalized_at = coalesce(finalized_at, now())
  where exam_id = p_exam_id and status = 'in_progress';

  -- 5. Soft-delete exam
  update public.exams
  set deleted_at = now()
  where id = p_exam_id;

  return query select true, 'SUCCESS';
end;
$$;

grant execute on function public.delete_exam(uuid) to authenticated;
