-- Pamuk Eller: aile üyesi kayıtlarında aile/kullanıcı kimliği sabit kalmalı.
-- Rol değişikliği mevcut RLS politikasıyla devam eder; üyelik ekleme add_family_member RPC'siyle yapılır.

create or replace function public.prevent_family_member_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.family_id is distinct from old.family_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Aile üyesinin aile ve kullanıcı kimliği değiştirilemez.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_family_member_identity_change() from public, anon, authenticated;

drop trigger if exists trg_protect_family_member_identity on public.family_members;
create trigger trg_protect_family_member_identity
before update of family_id, user_id on public.family_members
for each row
execute function public.prevent_family_member_identity_change();
