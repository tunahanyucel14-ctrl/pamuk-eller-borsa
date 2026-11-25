-- Pamuk Eller: aileye özel hedef fotoğrafları
-- Dosya yolu: <family_id>/<goal_id>/<random-file-name>
-- Fotoğraflar private bucket'ta tutulur; public URL kullanılmaz.

alter table public.family_goals
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'goal-photos',
  'goal-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage path içinden aile/hedef kimliklerini güvenli şekilde çözer.
-- SECURITY DEFINER, storage.objects politikası değerlendirilirken family_goals
-- RLS politikalarına bağlı kalmadan hedef-aile eşleşmesini doğrular.
create or replace function private.goal_photo_path_allowed(
  p_object_name text,
  p_write boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[];
  v_family_id uuid;
  v_goal_id uuid;
begin
  v_parts := string_to_array(coalesce(p_object_name, ''), '/');

  if coalesce(array_length(v_parts, 1), 0) <> 3
     or v_parts[3] = ''
     or v_parts[3] in ('.', '..') then
    return false;
  end if;

  begin
    v_family_id := v_parts[1]::uuid;
    v_goal_id := v_parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if p_write then
    return private.family_can_write(v_family_id)
      and exists (
        select 1
        from public.family_goals g
        where g.id = v_goal_id
          and g.family_id = v_family_id
      );
  end if;

  return private.is_family_member(v_family_id)
    and exists (
      select 1
      from public.family_goals g
      where g.id = v_goal_id
        and g.family_id = v_family_id
    );
end;
$$;

revoke all on function private.goal_photo_path_allowed(text, boolean)
  from public, anon;
grant execute on function private.goal_photo_path_allowed(text, boolean)
  to authenticated;

drop policy if exists "goal_photos_select" on storage.objects;
create policy "goal_photos_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'goal-photos'
  and private.goal_photo_path_allowed(name, false)
);

drop policy if exists "goal_photos_insert" on storage.objects;
create policy "goal_photos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'goal-photos'
  and private.goal_photo_path_allowed(name, true)
);

drop policy if exists "goal_photos_update" on storage.objects;
create policy "goal_photos_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'goal-photos'
  and private.goal_photo_path_allowed(name, true)
)
with check (
  bucket_id = 'goal-photos'
  and private.goal_photo_path_allowed(name, true)
);

drop policy if exists "goal_photos_delete" on storage.objects;
create policy "goal_photos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'goal-photos'
  and private.goal_photo_path_allowed(name, true)
);
