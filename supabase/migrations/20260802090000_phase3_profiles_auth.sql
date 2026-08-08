create type public.profile_role as enum ('student', 'admin');
create type public.profile_status as enum ('active', 'locked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'student',
  status public.profile_status not null default 'active',
  display_name text null check (display_name is null or char_length(display_name) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_status_idx on public.profiles(status);

alter table public.profiles enable row level security;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  candidate_name text;
begin
  candidate_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');

  if candidate_name is not null then
    candidate_name := left(candidate_name, 100);
    if char_length(candidate_name) < 2 then
      candidate_name := null;
    end if;
  end if;

  insert into public.profiles (id, role, status, display_name)
  values (new.id, 'student', 'active', candidate_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

grant usage on type public.profile_role to authenticated, service_role;
grant usage on type public.profile_status to authenticated, service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select (id, role, status, display_name, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Students can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Admins can read profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

create policy "Students can update own display name"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = 'student' and status = 'active');
