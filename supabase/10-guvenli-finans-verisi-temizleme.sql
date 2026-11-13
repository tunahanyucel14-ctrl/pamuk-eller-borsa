-- Pamuk Eller: güvenli ve atomik aile finans verisi temizleme
-- Yalnızca aile sahibi/yöneticisi çalıştırabilir. Borsa Arenası ve aile üyelikleri korunur.

grant delete on table public.family_imported_transactions to authenticated;
drop policy if exists imported_transactions_delete on public.family_imported_transactions;
create policy imported_transactions_delete
on public.family_imported_transactions
for delete to authenticated
using (private.family_can_manage(family_id));

create or replace function public.clear_family_finances(p_family_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_imports integer := 0;
  v_transactions integer := 0;
  v_debts integer := 0;
  v_bills integer := 0;
  v_goals integer := 0;
  v_investments integer := 0;
  v_income_rules integer := 0;
  v_category_budgets integer := 0;
  v_accounts integer := 0;
  v_budget_sheets integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli.';
  end if;
  if not private.family_can_manage(p_family_id) then
    raise exception 'Finans verilerini topluca silmek için aile sahibi veya yönetici olmalısın.';
  end if;

  -- Parmak izi kayıtları silinmezse aynı ekstre tekrar içe aktarılamaz.
  delete from public.family_imported_transactions where family_id = p_family_id;
  get diagnostics v_imports = row_count;

  delete from public.fin_transactions where family_id = p_family_id;
  get diagnostics v_transactions = row_count;

  delete from public.family_debts where family_id = p_family_id;
  get diagnostics v_debts = row_count;

  delete from public.family_bills where family_id = p_family_id;
  get diagnostics v_bills = row_count;

  -- Hedef katkıları hedef silinirken foreign key cascade ile temizlenir.
  delete from public.family_goals where family_id = p_family_id;
  get diagnostics v_goals = row_count;

  delete from public.family_investments where family_id = p_family_id;
  get diagnostics v_investments = row_count;

  delete from public.family_income_rules where family_id = p_family_id;
  get diagnostics v_income_rules = row_count;

  delete from public.family_category_budgets where family_id = p_family_id;
  get diagnostics v_category_budgets = row_count;

  -- Hesap kayıtları korunur, sadece başlangıç bakiyesi sıfırlanır.
  update public.accounts set opening_balance = 0 where family_id = p_family_id;
  get diagnostics v_accounts = row_count;

  update public.family_budget_sheets
     set rows = '[]'::jsonb,
         notes = '',
         updated_by = auth.uid()
   where family_id = p_family_id;
  get diagnostics v_budget_sheets = row_count;

  return jsonb_build_object(
    'imports', v_imports,
    'transactions', v_transactions,
    'debts', v_debts,
    'bills', v_bills,
    'goals', v_goals,
    'investments', v_investments,
    'income_rules', v_income_rules,
    'category_budgets', v_category_budgets,
    'accounts_reset', v_accounts,
    'budget_sheets', v_budget_sheets
  );
end;
$$;

revoke all on function public.clear_family_finances(uuid) from public, anon;
grant execute on function public.clear_family_finances(uuid) to authenticated;
