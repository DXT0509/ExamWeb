create view public.public_exam_catalog
with (security_invoker = true)
as
select
  e.id as exam_id,
  e.slug,
  e.title,
  e.description,
  e.subject_id,
  s.name as subject_name,
  s.slug as subject_slug,
  e.category_id,
  c.name as category_name,
  c.slug as category_slug,
  e.duration_minutes,
  e.total_score,
  coalesce(count(q.id), 0)::integer as question_count,
  e.allow_guest_attempt,
  e.fullscreen_required,
  e.show_score_after_submit,
  e.show_answers_after_submit,
  e.show_solutions_after_submit,
  e.access_type,
  e.published_at
from public.exams e
join public.subjects s on s.id = e.subject_id and s.is_active and s.deleted_at is null
left join public.exam_categories c on c.id = e.category_id and c.is_active and c.deleted_at is null
left join public.exam_sections es on es.exam_id = e.id and es.deleted_at is null
left join public.questions q on q.section_id = es.id and q.is_active and q.deleted_at is null
where e.status = 'published'
  and e.deleted_at is null
group by
  e.id,
  e.slug,
  e.title,
  e.description,
  e.subject_id,
  s.name,
  s.slug,
  e.category_id,
  c.name,
  c.slug,
  e.duration_minutes,
  e.total_score,
  e.allow_guest_attempt,
  e.fullscreen_required,
  e.show_score_after_submit,
  e.show_answers_after_submit,
  e.show_solutions_after_submit,
  e.access_type,
  e.published_at;

grant select on public.public_exam_catalog to anon, authenticated;

grant select (id, exam_id, deleted_at) on public.exam_sections to anon, authenticated;
grant select (id, section_id, is_active, deleted_at) on public.questions to anon, authenticated;

create policy "Guests can read public section metadata" on public.exam_sections
for select to anon
using (
  deleted_at is null
  and exists (
    select 1
    from public.exams e
    where e.id = exam_sections.exam_id
      and e.status = 'published'
      and e.access_type = 'public'
      and e.deleted_at is null
  )
);

create policy "Students can read allowed section metadata" on public.exam_sections
for select to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.exams e
    where e.id = exam_sections.exam_id
      and e.status = 'published'
      and e.access_type in ('public', 'students_only')
      and e.deleted_at is null
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
          and p.status = 'active'
      )
  )
);

create policy "Guests can read public question metadata" on public.questions
for select to anon
using (
  is_active
  and deleted_at is null
  and exists (
    select 1
    from public.exam_sections s
    join public.exams e on e.id = s.exam_id
    where s.id = questions.section_id
      and s.deleted_at is null
      and e.status = 'published'
      and e.access_type = 'public'
      and e.deleted_at is null
  )
);

create policy "Students can read allowed question metadata" on public.questions
for select to authenticated
using (
  is_active
  and deleted_at is null
  and exists (
    select 1
    from public.exam_sections s
    join public.exams e on e.id = s.exam_id
    where s.id = questions.section_id
      and s.deleted_at is null
      and e.status = 'published'
      and e.access_type in ('public', 'students_only')
      and e.deleted_at is null
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
          and p.status = 'active'
      )
  )
);
