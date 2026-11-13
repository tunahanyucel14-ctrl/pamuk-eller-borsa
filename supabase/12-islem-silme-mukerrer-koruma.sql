-- Pamuk Eller: işlem silme ve banka ekstresi parmak izi tutarlılığı
-- Bir işlem silindiğinde bağlı ekstre parmak izi de silinir; aynı dosya yeniden içe aktarılabilir.

grant delete on table public.family_imported_transactions to authenticated;
drop policy if exists imported_transactions_delete on public.family_imported_transactions;
create policy imported_transactions_delete
on public.family_imported_transactions
for delete to authenticated
using (private.family_can_write(family_id));

create or replace function public.delete_family_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_imports integer := 0;
  v_transactions integer := 0;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;

  select family_id into v_family_id
  from public.fin_transactions
  where id = p_transaction_id;

  if v_family_id is null then raise exception 'İşlem bulunamadı.'; end if;
  if not private.family_can_write(v_family_id) then raise exception 'Bu işlemi silme yetkin yok.'; end if;

  delete from public.family_imported_transactions
  where family_id = v_family_id and transaction_id = p_transaction_id;
  get diagnostics v_imports = row_count;

  delete from public.fin_transactions
  where id = p_transaction_id and family_id = v_family_id;
  get diagnostics v_transactions = row_count;

  return jsonb_build_object('deleted_transactions',v_transactions,'deleted_import_fingerprints',v_imports);
end;
$$;

create or replace function public.clear_family_month_transactions(p_family_id uuid,p_month date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_start date;
  v_end date;
  v_imports integer := 0;
  v_transactions integer := 0;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;
  if not private.family_can_write(p_family_id) then raise exception 'Bu ailede işlem silme yetkin yok.'; end if;

  v_start := date_trunc('month',p_month)::date;
  v_end := (v_start + interval '1 month')::date;

  delete from public.family_imported_transactions
  where family_id = p_family_id
    and transaction_id in (
      select id from public.fin_transactions
      where family_id = p_family_id and tx_date >= v_start and tx_date < v_end
    );
  get diagnostics v_imports = row_count;

  delete from public.fin_transactions
  where family_id = p_family_id and tx_date >= v_start and tx_date < v_end;
  get diagnostics v_transactions = row_count;

  return jsonb_build_object('deleted_transactions',v_transactions,'deleted_import_fingerprints',v_imports,'month',v_start);
end;
$$;

revoke all on function public.delete_family_transaction(uuid) from public,anon;
revoke all on function public.clear_family_month_transactions(uuid,date) from public,anon;
grant execute on function public.delete_family_transaction(uuid) to authenticated;
grant execute on function public.clear_family_month_transactions(uuid,date) to authenticated;
