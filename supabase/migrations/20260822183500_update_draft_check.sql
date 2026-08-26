-- Update assert_exam_draft_for_content() so toggling deleted_at on sections, questions, and options is allowed
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
