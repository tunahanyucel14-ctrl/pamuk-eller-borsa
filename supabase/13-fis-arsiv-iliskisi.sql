-- Fiş arşivi: finans işlemiyle özel Storage dosyasını ilişkilendir
alter table public.fin_transactions
  add column if not exists receipt_path text null;

comment on column public.fin_transactions.receipt_path is
  'Private receipts bucket içindeki yükleyici kullanıcıya ait dosya yolu.';
