-- Create questions storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'questions',
  'questions',
  true,
  5242880, -- 5MB (5 * 1024 * 1024)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS Policies for questions bucket
create policy "Admins can upload question images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'questions'
  and public.is_admin()
);

create policy "Admins can update question images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'questions'
  and public.is_admin()
)
with check (
  bucket_id = 'questions'
  and public.is_admin()
);

create policy "Admins can delete question images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'questions'
  and public.is_admin()
);

create policy "Public can read question images"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'questions'
);
