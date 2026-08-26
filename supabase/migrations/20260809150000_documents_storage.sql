-- Create documents storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400, -- 25MB (25 * 1024 * 1024)
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS Policies for documents bucket
create policy "Admins can upload documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and public.is_admin()
);

create policy "Admins can update documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and public.is_admin()
)
with check (
  bucket_id = 'documents'
  and public.is_admin()
);

create policy "Admins can delete documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and public.is_admin()
);

create policy "Admins can select any documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and public.is_admin()
);

create policy "Public can read authorized document objects"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1 from public.documents d
    where d.file_path = storage.objects.name
      and d.status = 'published'
      and d.is_public = true
      and d.deleted_at is null
  )
);
