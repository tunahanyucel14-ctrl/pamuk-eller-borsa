-- Pamuk Eller: farklı para birimleri arasında hatalı transferleri engelle
-- Transferde çıkış ve hedef hesap aynı para biriminde olmalıdır; otomatik kur çevrimi yapılmaz.

create or replace function private.validate_fin_transaction_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_currency text;
  v_target_currency text;
begin
  if new.kind <> 'transfer' then
    return new;
  end if;

  select upper(a.currency) into v_source_currency
  from public.accounts a
  where a.id = new.account_id and a.family_id = new.family_id;

  select upper(a.currency) into v_target_currency
  from public.accounts a
  where a.id = new.to_account_id and a.family_id = new.family_id;

  if v_source_currency is null or v_target_currency is null then
    raise exception 'Transfer hesapları bulunamadı veya aynı aileye ait değil.';
  end if;

  if v_source_currency <> v_target_currency then
    raise exception 'Farklı para birimleri arasında doğrudan transfer yapılamaz. Önce aynı para biriminde hesap seç.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_fin_transaction_currency() from public, anon, authenticated;
drop trigger if exists trg_validate_fin_transaction_currency on public.fin_transactions;
create trigger trg_validate_fin_transaction_currency
before insert or update of family_id, account_id, to_account_id, kind
on public.fin_transactions
for each row
execute function private.validate_fin_transaction_currency();
