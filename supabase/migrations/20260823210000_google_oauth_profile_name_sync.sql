-- Phase 14: Google OAuth metadata synchronization for user profiles

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  candidate_name text;
begin
  candidate_name := nullif(trim(coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  )), '');

  if candidate_name is not null then
    candidate_name := left(candidate_name, 100);
    if char_length(candidate_name) < 2 then
      candidate_name := null;
    end if;
  end if;

  insert into public.profiles (id, role, status, display_name)
  values (new.id, 'student', 'active', candidate_name)
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;
