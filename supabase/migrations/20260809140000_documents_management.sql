create type public.document_status as enum ('draft', 'published', 'archived');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text null,
  file_path text null,
  external_url text null,
  status public.document_status not null default 'draft',
  is_public boolean not null default true,
  created_by uuid not null references public.profiles(id),
  updated_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint documents_title_length_check check (char_length(trim(title)) between 2 and 200),
  constraint documents_slug_format_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint documents_source_check check (
    (file_path is not null and external_url is null and char_length(trim(file_path)) > 0)
    or (external_url is not null and file_path is null and char_length(trim(external_url)) > 0)
  )
);

create unique index documents_slug_active_unique on public.documents (lower(slug)) where deleted_at is null;
create index documents_status_public_idx on public.documents (status, is_public) where deleted_at is null;
create index documents_slug_idx on public.documents (lower(slug)) where deleted_at is null;
create index documents_created_by_created_at_idx on public.documents (created_by, created_at desc);

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

grant select on public.documents to anon;
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;

create policy "Admins can manage documents"
on public.documents for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read published public documents"
on public.documents for select
to anon, authenticated
using (status = 'published' and is_public = true and deleted_at is null);
