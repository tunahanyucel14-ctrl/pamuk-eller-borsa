-- PAMUK ELLER: AİLE + GELİR-GİDER ŞEMASI
-- Güvenle tekrar çalıştırılabilir. Mevcut borsa tablolarına dokunmaz.

-- 1) TABLOLAR -------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  type text not null default 'banka' check (type in ('banka','nakit','yatirim')),
  currency text not null default 'TRY',
  opening_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('gelir','gider')),
  created_at timestamptz not null default now()
);

create table if not exists public.fin_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  kind text not null check (kind in ('gelir','gider','transfer')),
  amount numeric(18,2) not null check (amount > 0),
  description text,
  tx_date date not null default current_date,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id and category_id is null)
    or (kind <> 'transfer' and to_account_id is null)
  )
);

create index if not exists fin_tx_family_date on public.fin_transactions (family_id, tx_date);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.fin_transactions enable row level security;

-- Giriş yapmış kullanıcıların tabloya erişim izni (satır bazlı kontrolü RLS yapar)
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.fin_transactions to authenticated;

-- 2) YARDIMCI FONKSİYONLAR (rol kontrolü) ---------------------------------

create or replace function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid());
$$;

create or replace function public.family_can_write(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members
    where family_id = fid and user_id = auth.uid() and role in ('owner','admin','editor'));
$$;

create or replace function public.family_can_manage(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members
    where family_id = fid and user_id = auth.uid() and role in ('owner','admin'));
$$;

revoke all on function public.is_family_member(uuid) from public, anon;
revoke all on function public.family_can_write(uuid) from public, anon;
revoke all on function public.family_can_manage(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.family_can_write(uuid) to authenticated;
grant execute on function public.family_can_manage(uuid) to authenticated;

-- 3) GÜVENLİK KURALLARI (RLS) ---------------------------------------------

-- Aileler
drop policy if exists "aile_okuma" on public.families;
create policy "aile_okuma" on public.families for select to authenticated
  using (public.is_family_member(id));
drop policy if exists "aile_guncelleme" on public.families;
create policy "aile_guncelleme" on public.families for update to authenticated
  using (public.family_can_manage(id)) with check (public.family_can_manage(id));

-- Aile üyeleri (ekleme sadece add_family_member fonksiyonuyla yapılır)
drop policy if exists "uye_okuma" on public.family_members;
create policy "uye_okuma" on public.family_members for select to authenticated
  using (public.is_family_member(family_id));
drop policy if exists "uye_guncelleme" on public.family_members;
create policy "uye_guncelleme" on public.family_members for update to authenticated
  using (public.family_can_manage(family_id) and role <> 'owner')
  with check (public.family_can_manage(family_id) and role <> 'owner');
drop policy if exists "uye_silme" on public.family_members;
create policy "uye_silme" on public.family_members for delete to authenticated
  using (public.family_can_manage(family_id) and role <> 'owner');

-- Hesaplar
drop policy if exists "hesap_okuma" on public.accounts;
create policy "hesap_okuma" on public.accounts for select to authenticated
  using (public.is_family_member(family_id));
drop policy if exists "hesap_ekleme" on public.accounts;
create policy "hesap_ekleme" on public.accounts for insert to authenticated
  with check (public.family_can_write(family_id));
drop policy if exists "hesap_guncelleme" on public.accounts;
create policy "hesap_guncelleme" on public.accounts for update to authenticated
  using (public.family_can_write(family_id)) with check (public.family_can_write(family_id));
drop policy if exists "hesap_silme" on public.accounts;
create policy "hesap_silme" on public.accounts for delete to authenticated
  using (public.family_can_write(family_id));

-- Kategoriler
drop policy if exists "kategori_okuma" on public.categories;
create policy "kategori_okuma" on public.categories for select to authenticated
  using (public.is_family_member(family_id));
drop policy if exists "kategori_ekleme" on public.categories;
create policy "kategori_ekleme" on public.categories for insert to authenticated
  with check (public.family_can_write(family_id));
drop policy if exists "kategori_guncelleme" on public.categories;
create policy "kategori_guncelleme" on public.categories for update to authenticated
  using (public.family_can_write(family_id)) with check (public.family_can_write(family_id));
drop policy if exists "kategori_silme" on public.categories;
create policy "kategori_silme" on public.categories for delete to authenticated
  using (public.family_can_write(family_id));

-- Gelir / gider / transfer işlemleri
drop policy if exists "islem_okuma" on public.fin_transactions;
create policy "islem_okuma" on public.fin_transactions for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists "islem_ekleme" on public.fin_transactions;
create policy "islem_ekleme" on public.fin_transactions for insert to authenticated
  with check (
    public.family_can_write(family_id)
    and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = fin_transactions.family_id)
    and (to_account_id is null or exists (select 1 from public.accounts a where a.id = to_account_id and a.family_id = fin_transactions.family_id))
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.family_id = fin_transactions.family_id))
  );

drop policy if exists "islem_silme" on public.fin_transactions;
create policy "islem_silme" on public.fin_transactions for delete to authenticated
  using (public.family_can_write(family_id));

-- 4) HESAP BAKİYELERİ (otomatik hesaplanır) -------------------------------

create or replace view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.family_id,
  a.name,
  a.type,
  a.currency,
  a.opening_balance,
  a.opening_balance
    + coalesce((select sum(t.amount) from public.fin_transactions t where t.account_id = a.id and t.kind = 'gelir'), 0)
    - coalesce((select sum(t.amount) from public.fin_transactions t where t.account_id = a.id and t.kind = 'gider'), 0)
    - coalesce((select sum(t.amount) from public.fin_transactions t where t.account_id = a.id and t.kind = 'transfer'), 0)
    + coalesce((select sum(t.amount) from public.fin_transactions t where t.to_account_id = a.id and t.kind = 'transfer'), 0)
    as balance
from public.accounts a;

grant select on public.account_balances to authenticated;

-- 5) AİLE KURMA VE ÜYE EKLEME FONKSİYONLARI -------------------------------

create or replace function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Önce giriş yapmalısın';
  end if;

  insert into public.families (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Ailem'), auth.uid())
  returning id into v_id;

  insert into public.family_members (family_id, user_id, role) values (v_id, auth.uid(), 'owner');

  insert into public.categories (family_id, name, kind)
  select v_id, n, 'gelir' from unnest(array['Maaş','Nöbet','Kira Geliri','Serbest','Temettü','Ek Gelir']) as n;

  insert into public.categories (family_id, name, kind)
  select v_id, n, 'gider' from unnest(array['Kira','Faturalar','Market','Araç','Kredi Taksitleri','Sağlık','Eğitim','Eğlence','Diğer']) as n;

  insert into public.accounts (family_id, name, type, opening_balance) values (v_id, 'Nakit', 'nakit', 0);

  return v_id;
end $$;

create or replace function public.add_family_member(p_family uuid, p_email text, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.family_can_manage(p_family) then
    raise exception 'Bu işlem için yetkin yok';
  end if;
  if p_role not in ('admin','editor','viewer') then
    raise exception 'Geçersiz rol';
  end if;

  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'Bu e-posta ile kayıtlı kullanıcı yok. Önce siteye kayıt olmalı.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (p_family, v_uid, p_role)
  on conflict (family_id, user_id) do nothing;

  return 'ok';
end $$;

revoke all on function public.create_family(text) from public, anon;
revoke all on function public.add_family_member(uuid, text, text) from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.add_family_member(uuid, text, text) to authenticated;
