-- Kredi ödeme planları: belge analizinden çıkan taksitleri ayrı ve aile kapsamlı sakla.
create table if not exists public.family_loan_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  debt_id uuid references public.family_debts(id) on delete set null,
  bank_name text not null,
  loan_type text not null check (loan_type in ('konut','ihtiyac','tasit','ticari','diger')),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  principal_amount numeric(18,2) not null check (principal_amount > 0),
  remaining_amount numeric(18,2) not null check (remaining_amount >= 0),
  annual_interest_rate numeric(9,4) check (annual_interest_rate is null or (annual_interest_rate >= 0 and annual_interest_rate <= 200)),
  monthly_interest_rate numeric(9,4) check (monthly_interest_rate is null or (monthly_interest_rate >= 0 and monthly_interest_rate <= 20)),
  installment_count integer not null check (installment_count between 1 and 600),
  first_due_date date not null,
  last_due_date date not null,
  file_name text not null default '',
  storage_path text,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (last_due_date >= first_due_date),
  check (storage_path is null or (length(storage_path) <= 320 and split_part(storage_path,'/',1) = created_by::text))
);

alter table public.family_loan_plans add column if not exists remaining_amount numeric(18,2) check (remaining_amount is null or remaining_amount >= 0);
alter table public.family_loan_plans add column if not exists monthly_interest_rate numeric(9,4) check (monthly_interest_rate is null or (monthly_interest_rate >= 0 and monthly_interest_rate <= 20));

create index if not exists idx_family_loan_plans_family on public.family_loan_plans(family_id, status, first_due_date);
create index if not exists idx_family_loan_plans_debt on public.family_loan_plans(debt_id);
create unique index if not exists idx_family_loan_plans_one_active_debt on public.family_loan_plans(debt_id) where debt_id is not null and status = 'active';

create table if not exists public.family_loan_installments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.family_loan_plans(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  installment_no integer not null check (installment_no between 1 and 600),
  due_date date not null,
  installment_amount numeric(18,2) not null check (installment_amount > 0),
  principal_amount numeric(18,2) check (principal_amount is null or principal_amount >= 0),
  interest_amount numeric(18,2) check (interest_amount is null or interest_amount >= 0),
  fees_amount numeric(18,2) check (fees_amount is null or fees_amount >= 0),
  remaining_principal numeric(18,2) check (remaining_principal is null or remaining_principal >= 0),
  status text not null default 'pending' check (status in ('pending','paid','skipped')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(plan_id, installment_no)
);
create index if not exists idx_family_loan_installments_family_due on public.family_loan_installments(family_id, due_date, status);
create index if not exists idx_family_loan_installments_plan on public.family_loan_installments(plan_id, installment_no);

alter table public.family_loan_plans enable row level security;
alter table public.family_loan_installments enable row level security;

grant select, insert, update, delete on public.family_loan_plans to authenticated;
grant select, insert, update, delete on public.family_loan_installments to authenticated;

drop policy if exists family_loan_plans_select on public.family_loan_plans;
create policy family_loan_plans_select on public.family_loan_plans
for select to authenticated using (private.is_family_member(family_id));
drop policy if exists family_loan_plans_insert on public.family_loan_plans;
create policy family_loan_plans_insert on public.family_loan_plans
for insert to authenticated with check (private.family_can_write(family_id) and created_by = (select auth.uid()));
drop policy if exists family_loan_plans_update on public.family_loan_plans;
create policy family_loan_plans_update on public.family_loan_plans
for update to authenticated using (private.family_can_write(family_id))
with check (private.family_can_write(family_id));
drop policy if exists family_loan_plans_delete on public.family_loan_plans;
create policy family_loan_plans_delete on public.family_loan_plans
for delete to authenticated using (private.family_can_manage(family_id));

drop policy if exists family_loan_installments_select on public.family_loan_installments;
create policy family_loan_installments_select on public.family_loan_installments
for select to authenticated using (private.is_family_member(family_id));
drop policy if exists family_loan_installments_insert on public.family_loan_installments;
create policy family_loan_installments_insert on public.family_loan_installments
for insert to authenticated with check (
  private.family_can_write(family_id) and exists (
    select 1 from public.family_loan_plans p where p.id = family_loan_installments.plan_id and p.family_id = family_loan_installments.family_id
  )
);
drop policy if exists family_loan_installments_update on public.family_loan_installments;
create policy family_loan_installments_update on public.family_loan_installments
for update to authenticated using (private.family_can_write(family_id))
with check (
  private.family_can_write(family_id) and exists (
    select 1 from public.family_loan_plans p where p.id = family_loan_installments.plan_id and p.family_id = family_loan_installments.family_id
  )
);
drop policy if exists family_loan_installments_delete on public.family_loan_installments;
create policy family_loan_installments_delete on public.family_loan_installments
for delete to authenticated using (private.family_can_manage(family_id));

create or replace function public.save_family_loan_plan(p_family_id uuid, p_plan jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bank text;
  v_type text;
  v_currency text;
  v_principal numeric(18,2);
  v_rate numeric(9,4);
  v_monthly_rate numeric(9,4);
  v_schedule jsonb;
  v_count integer;
  v_first date;
  v_last date;
  v_previous date;
  v_due date;
  v_no integer;
  v_amount numeric(18,2);
  v_principal_part numeric(18,2);
  v_interest numeric(18,2);
  v_fees numeric(18,2);
  v_remaining_part numeric(18,2);
  v_sum_principal numeric(18,2) := 0;
  v_has_principal boolean := true;
  v_monthly numeric(18,2);
  v_remaining numeric(18,2);
  v_due_day integer;
  v_file text;
  v_path text;
  v_debt_id uuid;
  v_plan_id uuid;
  v_row jsonb;
  v_index integer := 0;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;
  if not private.family_can_write(p_family_id) then raise exception 'Bu aileye kredi planı ekleme yetkin yok.'; end if;
  if p_plan is null or jsonb_typeof(p_plan) is distinct from 'object' then raise exception 'Kredi planı biçimi geçersiz.'; end if;

  v_bank := left(trim(coalesce(p_plan->>'bank_name','')),80);
  v_type := p_plan->>'loan_type';
  v_currency := upper(coalesce(p_plan->>'currency','TRY'));
  v_principal := (p_plan->>'principal_amount')::numeric(18,2);
  v_rate := nullif(p_plan->>'annual_interest_rate','')::numeric(9,4);
  v_monthly_rate := nullif(p_plan->>'monthly_interest_rate','')::numeric(9,4);
  v_schedule := p_plan->'schedule';
  v_file := left(coalesce(p_plan->>'file_name',''),255);
  v_path := nullif(p_plan->>'storage_path','');

  if v_bank = '' then raise exception 'Banka adı gerekli.'; end if;
  if v_type is null or v_type not in ('konut','ihtiyac','tasit','ticari','diger') then raise exception 'Kredi türü geçersiz.'; end if;
  if v_currency !~ '^[A-Z]{3}$' then raise exception 'Para birimi kodu geçersiz.'; end if;
  if v_principal is null or v_principal <= 0 then raise exception 'Kredi anaparası sıfırdan büyük olmalı.'; end if;
  if v_rate is not null and (v_rate < 0 or v_rate > 200) then raise exception 'Yıllık faiz oranı geçersiz.'; end if;
  if v_monthly_rate is not null and (v_monthly_rate < 0 or v_monthly_rate > 20) then raise exception 'Aylık faiz oranı geçersiz.'; end if;
  if v_schedule is null or jsonb_typeof(v_schedule) is distinct from 'array' then raise exception 'Aylık ödeme tablosu bulunamadı.'; end if;
  v_count := jsonb_array_length(v_schedule);
  if v_count < 1 or v_count > 600 then raise exception 'Ödeme tablosu 1–600 taksit içermeli.'; end if;
  if v_path is not null and (length(v_path) > 320 or split_part(v_path,'/',1) <> auth.uid()::text) then raise exception 'Belge yolu kullanıcıya ait değil.'; end if;

  for v_row in select value from jsonb_array_elements(v_schedule) loop
    v_index := v_index + 1;
    v_no := (v_row->>'installment_no')::integer;
    v_due := (v_row->>'due_date')::date;
    v_amount := (v_row->>'installment_amount')::numeric(18,2);
    v_principal_part := nullif(v_row->>'principal_amount','')::numeric(18,2);
    v_interest := nullif(v_row->>'interest_amount','')::numeric(18,2);
    v_fees := nullif(v_row->>'fees_amount','')::numeric(18,2);
    v_remaining_part := nullif(v_row->>'remaining_principal','')::numeric(18,2);
    if v_no is null or v_due is null or v_amount is null or v_no <> v_index then raise exception 'Taksit numaraları 1’den başlayarak sıralı olmalı.'; end if;
    if v_amount <= 0 then raise exception '% numaralı taksit tutarı geçersiz.',v_no; end if;
    if v_principal_part is null then v_has_principal := false; else if v_principal_part < 0 then raise exception '% numaralı taksitin anapara payı negatif olamaz.',v_no; end if; v_sum_principal := v_sum_principal + v_principal_part; end if;
    if v_interest is not null and v_interest < 0 then raise exception '% numaralı taksitin faiz payı negatif olamaz.',v_no; end if;
    if v_fees is not null and v_fees < 0 then raise exception '% numaralı taksitin masrafı negatif olamaz.',v_no; end if;
    if v_remaining_part is not null and v_remaining_part < 0 then raise exception '% numaralı taksitin kalan anaparası negatif olamaz.',v_no; end if;
    if v_index = 1 then v_first := v_due; v_monthly := v_amount; end if;
    if v_previous is not null and v_due <= v_previous then raise exception 'Taksit tarihleri artan sırada olmalı.'; end if;
    v_previous := v_due;
    v_last := v_due;
  end loop;

  v_due_day := extract(day from v_first)::integer;
  v_remaining := nullif(p_plan->>'remaining_amount','')::numeric(18,2);
  if v_remaining is null then v_remaining := nullif(v_schedule->(v_count - 1)->>'remaining_principal','')::numeric(18,2); end if;
  if v_remaining is null and v_has_principal then v_remaining := greatest(0, v_principal - v_sum_principal); end if;
  if v_remaining is null then raise exception 'Kalan borç tutarı belgede hesaplanamadı. Kaydetmeden önce elle gir.'; end if;
  if v_remaining < 0 or v_remaining > v_principal then raise exception 'Kalan borç tutarı anapara ile uyumlu değil.'; end if;

  v_debt_id := nullif(p_plan->>'debt_id','')::uuid;
  if v_debt_id is not null and v_currency <> 'TRY' then raise exception 'Mevcut aile borç kaydı yalnızca TRY kredi planıyla eşleştirilebilir.'; end if;
  if v_debt_id is not null then
    update public.family_debts
      set name = v_bank || ' ' || v_type,
          creditor = v_bank,
          debt_type = 'kredi',
          original_amount = v_principal,
          remaining_amount = v_remaining,
          monthly_payment = v_monthly,
          annual_interest_rate = coalesce(v_rate,v_monthly_rate * 12,0),
          due_day = v_due_day,
          start_date = v_first,
          end_date = v_last,
          notes = concat_ws(E'
', nullif(notes,''), 'Ödeme planı belgesi: ' || v_file),
          updated_at = now()
    where id = v_debt_id and family_id = p_family_id;
    if not found then raise exception 'Seçilen borç bu ailede bulunamadı.'; end if;
  elsif v_currency = 'TRY' then
    insert into public.family_debts(family_id,created_by,name,creditor,debt_type,original_amount,remaining_amount,monthly_payment,annual_interest_rate,due_day,start_date,end_date,notes)
    values(p_family_id,auth.uid(),v_bank || ' ' || v_type,v_bank,'kredi',v_principal,v_remaining,v_monthly,coalesce(v_rate,v_monthly_rate * 12,0),v_due_day,v_first,v_last,'Ödeme planı belgesi: ' || v_file)
    returning id into v_debt_id;
  end if;

  insert into public.family_loan_plans(family_id,debt_id,bank_name,loan_type,currency,principal_amount,remaining_amount,annual_interest_rate,monthly_interest_rate,installment_count,first_due_date,last_due_date,file_name,storage_path,created_by)
  values(p_family_id,v_debt_id,v_bank,v_type,v_currency,v_principal,v_remaining,v_rate,v_monthly_rate,v_count,v_first,v_last,v_file,v_path,auth.uid())
  returning id into v_plan_id;

  for v_row in select value from jsonb_array_elements(v_schedule) loop
    insert into public.family_loan_installments(family_id,plan_id,installment_no,due_date,installment_amount,principal_amount,interest_amount,fees_amount,remaining_principal)
    values(
      p_family_id,v_plan_id,(v_row->>'installment_no')::integer,(v_row->>'due_date')::date,
      (v_row->>'installment_amount')::numeric(18,2),
      nullif(v_row->>'principal_amount','')::numeric(18,2),
      nullif(v_row->>'interest_amount','')::numeric(18,2),
      nullif(v_row->>'fees_amount','')::numeric(18,2),
      nullif(v_row->>'remaining_principal','')::numeric(18,2)
    );
  end loop;

  return jsonb_build_object('plan_id',v_plan_id,'debt_id',v_debt_id,'installment_count',v_count);
end;
$$;

revoke all on function public.save_family_loan_plan(uuid,jsonb) from public, anon;
grant execute on function public.save_family_loan_plan(uuid,jsonb) to authenticated;


-- A taksidini ödendi olarak işaretle; kalan anaparayı aynı işlemde güncelle.
create or replace function public.mark_family_loan_installment_paid(p_installment_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_family_id uuid;
  v_status text;
  v_principal_part numeric(18,2);
  v_remaining_part numeric(18,2);
  v_debt_id uuid;
  v_currency text;
  v_plan_remaining numeric(18,2);
  v_new_remaining numeric(18,2);
  v_balance_updated boolean := true;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;

  select i.plan_id, i.family_id, i.status, i.principal_amount, i.remaining_principal,
         p.debt_id, p.currency, p.remaining_amount
    into v_plan_id, v_family_id, v_status, v_principal_part, v_remaining_part,
         v_debt_id, v_currency, v_plan_remaining
  from public.family_loan_installments i
  join public.family_loan_plans p on p.id = i.plan_id and p.family_id = i.family_id
  where i.id = p_installment_id
  for update of i, p;

  if not found then raise exception 'Kredi taksiti bulunamadı.'; end if;
  if not private.family_can_write(v_family_id) then raise exception 'Bu taksiti güncelleme yetkin yok.'; end if;
  if v_status = 'paid' then
    return jsonb_build_object('already_paid', true, 'balance_updated', true, 'remaining_amount', v_plan_remaining);
  end if;
  if v_status <> 'pending' then raise exception 'Yalnızca bekleyen taksitler ödenmiş işaretlenebilir.'; end if;

  if v_remaining_part is not null then
    v_new_remaining := v_remaining_part;
  elsif v_principal_part is not null then
    v_new_remaining := greatest(0, v_plan_remaining - v_principal_part);
  else
    v_new_remaining := v_plan_remaining;
    v_balance_updated := false;
  end if;

  update public.family_loan_installments
     set status = 'paid', paid_at = now()
   where id = p_installment_id and family_id = v_family_id and status = 'pending';
  if not found then raise exception 'Taksit başka bir işlem tarafından güncellenmiş. Listeyi yenile.'; end if;

  if v_balance_updated then
    update public.family_loan_plans
       set remaining_amount = v_new_remaining, updated_at = now()
     where id = v_plan_id and family_id = v_family_id;
    if not found then raise exception 'Kredi planı güncellenemedi.'; end if;

    if v_debt_id is not null and v_currency = 'TRY' then
      update public.family_debts
         set remaining_amount = v_new_remaining, updated_at = now()
       where id = v_debt_id and family_id = v_family_id;
      if not found then raise exception 'Bağlı kredi borcu güncellenemedi. Taksit durumu değiştirilmedi.'; end if;
    end if;
  end if;

  return jsonb_build_object(
    'already_paid', false,
    'balance_updated', v_balance_updated,
    'remaining_amount', v_new_remaining
  );
end;
$$;

revoke all on function public.mark_family_loan_installment_paid(uuid) from public, anon;
grant execute on function public.mark_family_loan_installment_paid(uuid) to authenticated;
