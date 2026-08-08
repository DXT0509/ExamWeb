create function public.reorder_exam_sections(target_exam_id uuid, ordered_section_ids uuid[])
returns table (success boolean, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED'; return; end if;
  if not exists (select 1 from public.exams where id = target_exam_id and status = 'draft' and deleted_at is null) then
    return query select false, 'EXAM_NOT_DRAFT'; return;
  end if;
  select count(*) into current_count from public.exam_sections where exam_id = target_exam_id and deleted_at is null;
  if current_count <> coalesce(array_length(ordered_section_ids, 1), 0)
    or exists (
      select 1 from unnest(ordered_section_ids) item(id)
      where not exists (
        select 1 from public.exam_sections s
        where s.id = item.id and s.exam_id = target_exam_id and s.deleted_at is null
      )
    ) then
    return query select false, 'REORDER_INVALID_ITEMS'; return;
  end if;

  update public.exam_sections set position = -position where exam_id = target_exam_id and deleted_at is null;
  update public.exam_sections s
  set position = item.position
  from unnest(ordered_section_ids) with ordinality as item(id, position)
  where s.id = item.id;
  return query select true, 'OK';
end;
$$;

create function public.reorder_section_questions(target_section_id uuid, ordered_question_ids uuid[])
returns table (success boolean, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  target_exam_status public.exam_status;
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED'; return; end if;
  select e.status into target_exam_status
  from public.exam_sections s join public.exams e on e.id = s.exam_id
  where s.id = target_section_id and s.deleted_at is null and e.deleted_at is null;
  if target_exam_status is distinct from 'draft' then return query select false, 'EXAM_NOT_DRAFT'; return; end if;
  select count(*) into current_count from public.questions where section_id = target_section_id and deleted_at is null;
  if current_count <> coalesce(array_length(ordered_question_ids, 1), 0)
    or exists (
      select 1 from unnest(ordered_question_ids) item(id)
      where not exists (
        select 1 from public.questions q
        where q.id = item.id and q.section_id = target_section_id and q.deleted_at is null
      )
    ) then
    return query select false, 'REORDER_INVALID_ITEMS'; return;
  end if;

  update public.questions set position = -position where section_id = target_section_id and deleted_at is null;
  update public.questions q
  set position = item.position
  from unnest(ordered_question_ids) with ordinality as item(id, position)
  where q.id = item.id;
  return query select true, 'OK';
end;
$$;

create function public.reorder_question_options(target_question_id uuid, ordered_option_ids uuid[])
returns table (success boolean, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  target_exam_status public.exam_status;
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED'; return; end if;
  select e.status into target_exam_status
  from public.questions q
  join public.exam_sections s on s.id = q.section_id
  join public.exams e on e.id = s.exam_id
  where q.id = target_question_id and q.deleted_at is null and s.deleted_at is null and e.deleted_at is null;
  if target_exam_status is distinct from 'draft' then return query select false, 'EXAM_NOT_DRAFT'; return; end if;
  select count(*) into current_count from public.question_options where question_id = target_question_id and deleted_at is null;
  if current_count <> coalesce(array_length(ordered_option_ids, 1), 0)
    or exists (
      select 1 from unnest(ordered_option_ids) item(id)
      where not exists (
        select 1 from public.question_options o
        where o.id = item.id and o.question_id = target_question_id and o.deleted_at is null
      )
    ) then
    return query select false, 'REORDER_INVALID_ITEMS'; return;
  end if;

  update public.question_options set position = -position where question_id = target_question_id and deleted_at is null;
  update public.question_options o
  set position = item.position
  from unnest(ordered_option_ids) with ordinality as item(id, position)
  where o.id = item.id;
  return query select true, 'OK';
end;
$$;

grant execute on function public.reorder_exam_sections(uuid, uuid[]), public.reorder_section_questions(uuid, uuid[]), public.reorder_question_options(uuid, uuid[]) to authenticated;
