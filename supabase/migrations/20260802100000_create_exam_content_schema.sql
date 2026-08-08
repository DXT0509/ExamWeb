create type public.exam_status as enum ('draft', 'published', 'closed', 'archived');
create type public.exam_access_type as enum ('public', 'students_only', 'private');

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  updated_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint subjects_name_length_check check (char_length(trim(name)) between 2 and 100),
  constraint subjects_slug_format_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.exam_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  updated_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint exam_categories_name_length_check check (char_length(trim(name)) between 2 and 100),
  constraint exam_categories_slug_format_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  category_id uuid null references public.exam_categories(id),
  title text not null,
  slug text not null,
  description text null,
  status public.exam_status not null default 'draft',
  access_type public.exam_access_type not null default 'public',
  allow_guest_attempt boolean not null default false,
  fullscreen_required boolean not null default true,
  duration_minutes integer not null,
  total_score numeric(10,2) not null default 0,
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  show_score_after_submit boolean not null default true,
  show_answers_after_submit boolean not null default false,
  show_solutions_after_submit boolean not null default false,
  published_at timestamptz null,
  closed_at timestamptz null,
  archived_at timestamptz null,
  created_by uuid not null references public.profiles(id),
  updated_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint exams_title_length_check check (char_length(trim(title)) between 2 and 200),
  constraint exams_slug_format_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint exams_duration_check check (duration_minutes between 1 and 300),
  constraint exams_total_score_check check (total_score >= 0),
  constraint exams_guest_access_check check (allow_guest_attempt = false or access_type = 'public'),
  constraint exams_randomization_mvp_check check (randomize_questions = false and randomize_options = false),
  constraint exams_status_timestamp_check check (
    (status = 'draft' and closed_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and closed_at is null and archived_at is null)
    or (status = 'closed' and published_at is not null and closed_at is not null and archived_at is null)
    or (status = 'archived' and published_at is not null and archived_at is not null)
  )
);

create table public.exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id),
  title text not null,
  description text null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint exam_sections_title_length_check check (char_length(trim(title)) between 1 and 200),
  constraint exam_sections_position_check check (position >= 1)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.exam_sections(id),
  content text not null,
  image_path text null,
  explanation text null,
  score numeric(10,2) not null default 1,
  position integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint questions_content_check check (char_length(trim(content)) > 0),
  constraint questions_score_check check (score > 0),
  constraint questions_position_check check (position >= 1)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id),
  content text not null,
  position integer not null,
  is_correct boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint question_options_content_check check (char_length(trim(content)) > 0),
  constraint question_options_position_check check (position >= 1),
  constraint question_options_question_id_id_unique unique (question_id, id)
);

create unique index subjects_slug_active_unique on public.subjects (lower(slug)) where deleted_at is null;
create index subjects_active_idx on public.subjects (is_active) where deleted_at is null;
create index subjects_slug_idx on public.subjects (lower(slug)) where deleted_at is null;

create unique index exam_categories_slug_active_unique on public.exam_categories (lower(slug)) where deleted_at is null;
create index exam_categories_active_idx on public.exam_categories (is_active) where deleted_at is null;
create index exam_categories_slug_idx on public.exam_categories (lower(slug)) where deleted_at is null;

create unique index exams_slug_active_unique on public.exams (lower(slug)) where deleted_at is null;
create index exams_status_access_idx on public.exams (status, access_type) where deleted_at is null;
create index exams_subject_status_idx on public.exams (subject_id, status) where deleted_at is null;
create index exams_category_status_idx on public.exams (category_id, status) where deleted_at is null;
create index exams_created_by_created_at_idx on public.exams (created_by, created_at desc);
create index exams_title_search_idx on public.exams using gin (to_tsvector('simple', coalesce(title, '')));

create unique index exam_sections_exam_position_active_unique on public.exam_sections (exam_id, position) where deleted_at is null;
create index exam_sections_exam_position_idx on public.exam_sections (exam_id, position) where deleted_at is null;

create unique index questions_section_position_active_unique on public.questions (section_id, position) where deleted_at is null;
create index questions_section_position_idx on public.questions (section_id, position) where deleted_at is null;

create unique index question_options_question_position_active_unique on public.question_options (question_id, position) where deleted_at is null;
create index question_options_question_position_idx on public.question_options (question_id, position) where deleted_at is null;
create index question_options_correct_idx on public.question_options (question_id) where is_correct = true and is_active = true and deleted_at is null;

create trigger subjects_set_updated_at before update on public.subjects for each row execute function public.set_updated_at();
create trigger exam_categories_set_updated_at before update on public.exam_categories for each row execute function public.set_updated_at();
create trigger exams_set_updated_at before update on public.exams for each row execute function public.set_updated_at();
create trigger exam_sections_set_updated_at before update on public.exam_sections for each row execute function public.set_updated_at();
create trigger questions_set_updated_at before update on public.questions for each row execute function public.set_updated_at();
create trigger question_options_set_updated_at before update on public.question_options for each row execute function public.set_updated_at();

create function public.exam_for_section(section_exam_id uuid)
returns public.exams
language sql
stable
set search_path = public
as $$ select e from public.exams e where e.id = section_exam_id $$;

create function public.assert_exam_draft_for_content()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status public.exam_status;
  parent_deleted_at timestamptz;
begin
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

create function public.protect_exam_update()
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
      or new.total_score is distinct from old.total_score
      or new.deleted_at is distinct from old.deleted_at then
      raise exception using errcode = 'P0001', message = 'EXAM_CONTENT_LOCKED';
    end if;
  end if;

  if new.total_score is distinct from old.total_score and new.status = old.status then
    raise exception using errcode = 'P0001', message = 'TOTAL_SCORE_SERVER_CONTROLLED';
  end if;

  return new;
end;
$$;

create trigger exams_protect_update before update on public.exams for each row execute function public.protect_exam_update();
create trigger exam_sections_draft_only before insert or update on public.exam_sections for each row execute function public.assert_exam_draft_for_content();
create trigger questions_draft_only before insert or update on public.questions for each row execute function public.assert_exam_draft_for_content();
create trigger question_options_draft_only before insert or update on public.question_options for each row execute function public.assert_exam_draft_for_content();

create function public.publish_exam(exam_id uuid)
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
    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null
        and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active and o.deleted_at is null) < 2
    ) then 'QUESTION_HAS_TOO_FEW_OPTIONS'
    when exists (
      select 1 from public.questions q join public.exam_sections s on s.id = q.section_id
      where s.exam_id = target.id and q.is_active and q.deleted_at is null
        and (select count(*) from public.question_options o where o.question_id = q.id and o.is_active and o.deleted_at is null and o.is_correct) <> 1
    ) then 'QUESTION_INVALID_CORRECT_OPTION_COUNT'
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

create function public.return_exam_to_draft(exam_id uuid)
returns table (success boolean, code text, draft_exam_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED', exam_id; return; end if;
  update public.exams set status = 'draft', closed_at = null, archived_at = null, updated_by = auth.uid()
  where id = exam_id and status = 'published' and deleted_at is null;
  if not found then return query select false, 'EXAM_NOT_PUBLISHED', exam_id; return; end if;
  return query select true, 'OK', exam_id;
end;
$$;

create function public.close_exam(exam_id uuid)
returns table (success boolean, code text, closed_exam_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED', exam_id; return; end if;
  update public.exams set status = 'closed', closed_at = now(), updated_by = auth.uid()
  where id = exam_id and status = 'published' and deleted_at is null;
  if not found then return query select false, 'EXAM_NOT_PUBLISHED', exam_id; return; end if;
  return query select true, 'OK', exam_id;
end;
$$;

create function public.archive_exam(exam_id uuid)
returns table (success boolean, code text, archived_exam_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return query select false, 'ADMIN_REQUIRED', exam_id; return; end if;
  update public.exams set status = 'archived', archived_at = now(), updated_by = auth.uid()
  where id = exam_id and status in ('published', 'closed') and deleted_at is null;
  if not found then return query select false, 'EXAM_NOT_ARCHIVABLE', exam_id; return; end if;
  return query select true, 'OK', exam_id;
end;
$$;

create function public.clone_exam(source_exam_id uuid, new_title text, new_slug text)
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
    show_score_after_submit, show_answers_after_submit, show_solutions_after_submit, created_by, updated_by
  ) values (
    source.subject_id, source.category_id, trim(new_title), lower(new_slug), source.description, 'draft',
    source.access_type, source.allow_guest_attempt, source.fullscreen_required, source.duration_minutes,
    source.total_score, false, false, source.show_score_after_submit, source.show_answers_after_submit,
    source.show_solutions_after_submit, auth.uid(), auth.uid()
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
    insert into public.questions (section_id, content, image_path, explanation, score, position, is_active)
    values (question_pair.new_id, question_pair.content, question_pair.image_path, question_pair.explanation, question_pair.score, question_pair.position, question_pair.is_active)
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

alter table public.subjects enable row level security;
alter table public.exam_categories enable row level security;
alter table public.exams enable row level security;
alter table public.exam_sections enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;

grant usage on type public.exam_status to anon, authenticated, service_role;
grant usage on type public.exam_access_type to anon, authenticated, service_role;
grant select on public.subjects, public.exam_categories, public.exams to anon, authenticated;
grant select on public.exam_sections, public.questions, public.question_options to authenticated;
grant insert, update on public.subjects, public.exam_categories, public.exams, public.exam_sections, public.questions, public.question_options to authenticated;
grant all on public.subjects, public.exam_categories, public.exams, public.exam_sections, public.questions, public.question_options to service_role;
grant execute on function public.publish_exam(uuid), public.return_exam_to_draft(uuid), public.close_exam(uuid), public.archive_exam(uuid), public.clone_exam(uuid, text, text) to authenticated;

create policy "Admins can manage subjects" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read active subjects" on public.subjects for select to anon, authenticated using (is_active and deleted_at is null);

create policy "Admins can manage categories" on public.exam_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read active categories" on public.exam_categories for select to anon, authenticated using (is_active and deleted_at is null);

create policy "Admins can manage exams" on public.exams for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Guests can read public published exams" on public.exams for select to anon using (status = 'published' and access_type = 'public' and deleted_at is null);
create policy "Students can read allowed published exams" on public.exams for select to authenticated using (
  deleted_at is null and status = 'published' and access_type in ('public', 'students_only')
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student' and p.status = 'active')
);

create policy "Admins can manage sections" on public.exam_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage questions" on public.questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage options" on public.question_options for all to authenticated using (public.is_admin()) with check (public.is_admin());
