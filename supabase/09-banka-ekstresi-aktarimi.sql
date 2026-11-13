-- Banka ekstresi CSV aktarımı: mükerrer koruması
-- Uygulama onaylanan satırları tek bir RPC çağrısında, RLS kapsamı içinde ekler.
create table if not exists public.family_imported_transactions (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 fingerprint text not null check(fingerprint ~ '^[0-9a-f]{64}$'),
 transaction_id uuid references public.fin_transactions(id) on delete set null,
 source_file text not null default '',
 imported_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 imported_at timestamptz not null default now(),
 unique(family_id,fingerprint)
);
create index if not exists idx_family_imported_transactions_family_date on public.family_imported_transactions(family_id,imported_at desc);
create index if not exists idx_family_imported_transactions_transaction on public.family_imported_transactions(transaction_id);
alter table public.family_imported_transactions enable row level security;
grant select,insert,update on public.family_imported_transactions to authenticated;
create policy imported_transactions_select on public.family_imported_transactions for select to authenticated using(private.is_family_member(family_id));
create policy imported_transactions_insert on public.family_imported_transactions for insert to authenticated with check(private.family_can_write(family_id) and imported_by=(select auth.uid()));
create policy imported_transactions_update on public.family_imported_transactions for update to authenticated using(private.family_can_write(family_id)) with check(private.family_can_write(family_id) and imported_by=(select auth.uid()));

create or replace function public.import_bank_statement(p_family_id uuid,p_rows jsonb,p_source_file text default '')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row jsonb; v_fingerprint text; v_account_id uuid; v_category_id uuid; v_kind text; v_amount numeric(18,2); v_date date; v_description text; v_import_id uuid; v_tx_id uuid; v_inserted integer:=0; v_duplicates integer:=0; v_count integer:=0;
begin
 if auth.uid() is null then raise exception 'Oturum gerekli.'; end if;
 if not private.family_can_write(p_family_id) then raise exception 'Bu aileye işlem ekleme yetkin yok.'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 then raise exception 'İçe aktarılacak satır bulunamadı.'; end if;
 if jsonb_array_length(p_rows)>1000 then raise exception 'Tek seferde en fazla 1000 satır aktarılabilir.'; end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  v_count:=v_count+1; v_fingerprint:=v_row->>'fingerprint'; v_account_id:=(v_row->>'account_id')::uuid; v_category_id:=nullif(v_row->>'category_id','')::uuid; v_kind:=v_row->>'kind'; v_amount:=(v_row->>'amount')::numeric(18,2); v_date:=(v_row->>'tx_date')::date; v_description:=left(coalesce(v_row->>'description',''),500);
  if v_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'Satır %: geçersiz işlem parmak izi.',v_count; end if;
  if v_kind not in ('gelir','gider') then raise exception 'Satır %: işlem türü gelir veya gider olmalı.',v_count; end if;
  if v_amount<=0 then raise exception 'Satır %: tutar sıfırdan büyük olmalı.',v_count; end if;
  if not exists(select 1 from public.accounts a where a.id=v_account_id and a.family_id=p_family_id) then raise exception 'Satır %: hesap bu aileye ait değil.',v_count; end if;
  if v_category_id is not null and not exists(select 1 from public.categories c where c.id=v_category_id and c.family_id=p_family_id and c.kind=v_kind) then raise exception 'Satır %: kategori işlem türüyle uyuşmuyor.',v_count; end if;
  v_import_id:=null;
  insert into public.family_imported_transactions(family_id,fingerprint,source_file,imported_by) values(p_family_id,v_fingerprint,left(coalesce(p_source_file,''),255),auth.uid()) on conflict(family_id,fingerprint) do nothing returning id into v_import_id;
  if v_import_id is null then v_duplicates:=v_duplicates+1; continue; end if;
  insert into public.fin_transactions(family_id,account_id,category_id,kind,amount,description,tx_date) values(p_family_id,v_account_id,v_category_id,v_kind,v_amount,v_description,v_date) returning id into v_tx_id;
  update public.family_imported_transactions set transaction_id=v_tx_id where id=v_import_id;
  v_inserted:=v_inserted+1;
 end loop;
 return jsonb_build_object('inserted',v_inserted,'duplicates',v_duplicates,'checked',v_count);
end; $$;
revoke all on function public.import_bank_statement(uuid,jsonb,text) from public,anon;
grant execute on function public.import_bank_statement(uuid,jsonb,text) to authenticated;
