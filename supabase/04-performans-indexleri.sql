-- Foreign key sütunları için performans indeksleri.
-- Bu indeksler silme/güncelleme kontrollerini ve aile bazlı listelemeleri hızlandırır.
create index if not exists idx_accounts_family_id on public.accounts(family_id);
create index if not exists idx_categories_family_id on public.categories(family_id);
create index if not exists idx_families_created_by on public.families(created_by);
create index if not exists idx_family_bills_created_by on public.family_bills(created_by);
create index if not exists idx_family_bills_family_id on public.family_bills(family_id);
create index if not exists idx_family_budget_sheets_updated_by on public.family_budget_sheets(updated_by);
create index if not exists idx_family_debts_created_by on public.family_debts(created_by);
create index if not exists idx_family_debts_family_id on public.family_debts(family_id);
create index if not exists idx_family_goals_created_by on public.family_goals(created_by);
create index if not exists idx_family_goals_family_id on public.family_goals(family_id);
create index if not exists idx_family_investments_created_by on public.family_investments(created_by);
create index if not exists idx_family_investments_family_id on public.family_investments(family_id);
create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_fin_transactions_account_id on public.fin_transactions(account_id);
create index if not exists idx_fin_transactions_category_id on public.fin_transactions(category_id);
create index if not exists idx_fin_transactions_created_by on public.fin_transactions(created_by);
create index if not exists idx_fin_transactions_to_account_id on public.fin_transactions(to_account_id);
create index if not exists idx_portfolios_stock_id on public.portfolios(stock_id);
create index if not exists idx_transactions_stock_id on public.transactions(stock_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
