-- Düzenli gelir planı: maaş, ek ödeme, nöbet, kira ve diğer gelirler.
create table if not exists public.family_income_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  income_type text not null default 'diger' check (income_type in ('maas','ek_odeme','nobet','prim','kira','diger')),
  expected_amount numeric(18,2) not null check (expected_amount >= 0),
  pay_day smallint not null check (pay_day between 1 and 31),
  active boolean not null default true,
  notes text not null default '',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_family_income_rules_family_id on public.family_income_rules(family_id);
alter table public.family_income_rules enable row level security;
grant select, insert, update, delete on public.family_income_rules to authenticated;
drop policy if exists "income_rules_read" on public.family_income_rules;
create policy "income_rules_read" on public.family_income_rules for select to authenticated using (public.is_family_member(family_id));
drop policy if exists "income_rules_insert" on public.family_income_rules;
create policy "income_rules_insert" on public.family_income_rules for insert to authenticated with check (public.family_can_write(family_id));
drop policy if exists "income_rules_update" on public.family_income_rules;
create policy "income_rules_update" on public.family_income_rules for update to authenticated using (public.family_can_write(family_id)) with check (public.family_can_write(family_id));
drop policy if exists "income_rules_delete" on public.family_income_rules;
create policy "income_rules_delete" on public.family_income_rules for delete to authenticated using (public.family_can_write(family_id));
