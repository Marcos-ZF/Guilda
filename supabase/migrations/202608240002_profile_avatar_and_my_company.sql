-- Avatar próprio da conta, separado da imagem pública da ficha.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Usuarios enviam o proprio avatar" on storage.objects;
create policy "Usuarios enviam o proprio avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Usuarios visualizam o proprio avatar" on storage.objects;
create policy "Usuarios visualizam o proprio avatar"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Usuarios atualizam o proprio avatar" on storage.objects;
create policy "Usuarios atualizam o proprio avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Usuarios removem o proprio avatar" on storage.objects;
create policy "Usuarios removem o proprio avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
