-- Pamuk Eller: hedef katkı geçmişi ve kategori bazlı aylık bütçe limitleri
create table if not exists public.family_goal_contributions (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 goal_id uuid not null references public.family_goals(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict,
 amount numeric(18,2) not null check(amount>0),
 direction text not null default 'deposit' check(direction in ('deposit','withdrawal')),
 note text not null default '',
 contribution_date date not null default current_date,
 created_at timestamptz not null default now()
);
create index if not exists idx_goal_contributions_family_goal_date on public.family_goal_contributions(family_id,goal_id,contribution_date desc);
create index if not exists idx_goal_contributions_user on public.family_goal_contributions(user_id);
alter table public.family_goal_contributions enable row level security;
grant select,insert on public.family_goal_contributions to authenticated;
drop policy if exists goal_contributions_select on public.family_goal_contributions;
create policy goal_contributions_select on public.family_goal_contributions for select to authenticated using(private.is_family_member(family_id));
drop policy if exists goal_contributions_insert on public.family_goal_contributions;
create policy goal_contributions_insert on public.family_goal_contributions for insert to authenticated with check(
 user_id=(select auth.uid()) and private.family_can_write(family_goal_contributions.family_id)
 and exists(select 1 from public.family_goals g where g.id=family_goal_contributions.goal_id and g.family_id=family_goal_contributions.family_id)
);
create or replace function private.apply_family_goal_contribution() returns trigger language plpgsql security definer set search_path='' as $$
declare v_current numeric(18,2);
begin
 update public.family_goals g set current_amount=case when new.direction='deposit' then g.current_amount+new.amount else g.current_amount-new.amount end
 where g.id=new.goal_id and g.family_id=new.family_id and (new.direction='deposit' or g.current_amount>=new.amount)
 returning g.current_amount into v_current;
 if not found then raise exception 'Hedef bulunamadı veya çekim mevcut birikimi aşıyor.'; end if;
 return new;
end; $$;
revoke all on function private.apply_family_goal_contribution() from public,anon,authenticated;
drop trigger if exists trg_apply_family_goal_contribution on public.family_goal_contributions;
create trigger trg_apply_family_goal_contribution after insert on public.family_goal_contributions for each row execute function private.apply_family_goal_contribution();

create table if not exists public.family_category_budgets (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 category_id uuid not null references public.categories(id) on delete cascade,
 budget_month date not null check(extract(day from budget_month)=1),
 limit_amount numeric(18,2) not null check(limit_amount>0),
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(family_id,category_id,budget_month)
);
create index if not exists idx_category_budgets_family_month on public.family_category_budgets(family_id,budget_month);
alter table public.family_category_budgets enable row level security;
grant select,insert,update,delete on public.family_category_budgets to authenticated;
drop policy if exists category_budgets_select on public.family_category_budgets;
create policy category_budgets_select on public.family_category_budgets for select to authenticated using(private.is_family_member(family_id));
drop policy if exists category_budgets_insert on public.family_category_budgets;
create policy category_budgets_insert on public.family_category_budgets for insert to authenticated with check(
 private.family_can_write(family_category_budgets.family_id) and created_by=(select auth.uid())
 and exists(select 1 from public.categories c where c.id=family_category_budgets.category_id and c.family_id=family_category_budgets.family_id and c.kind='gider')
);
drop policy if exists category_budgets_update on public.family_category_budgets;
create policy category_budgets_update on public.family_category_budgets for update to authenticated
 using(private.family_can_write(family_category_budgets.family_id))
 with check(private.family_can_write(family_category_budgets.family_id) and exists(
 select 1 from public.categories c where c.id=family_category_budgets.category_id and c.family_id=family_category_budgets.family_id and c.kind='gider'
));
drop policy if exists category_budgets_delete on public.family_category_budgets;
create policy category_budgets_delete on public.family_category_budgets for delete to authenticated using(private.family_can_write(family_id));

-- Foreign key performance indexes
create index if not exists idx_category_budgets_category_id on public.family_category_budgets(category_id);
create index if not exists idx_category_budgets_created_by on public.family_category_budgets(created_by);
create index if not exists idx_goal_contributions_goal_id on public.family_goal_contributions(goal_id);
