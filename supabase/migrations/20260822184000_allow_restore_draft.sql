-- Allow return_exam_to_draft from published, closed, or archived
create or replace function public.return_exam_to_draft(exam_id uuid)
returns table (success boolean, code text, draft_exam_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED', exam_id; return; end if;
  update public.exams set status = 'draft', closed_at = null, archived_at = null, updated_by = auth.uid()
  where id = exam_id and status in ('published', 'closed', 'archived');
  if not found then return query select false, 'EXAM_NOT_FOUND', exam_id; return; end if;
  return query select true, 'OK', exam_id;
end;
$$;
