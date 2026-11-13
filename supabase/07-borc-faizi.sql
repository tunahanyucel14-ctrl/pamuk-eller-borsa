-- Pamuk Eller: Borç faiz oranı ve simülasyon verisi
-- Yıllık nominal faiz oranı yüzde olarak saklanır.
alter table public.family_debts
  add column if not exists annual_interest_rate numeric(7,4) not null default 0
  check (annual_interest_rate >= 0 and annual_interest_rate <= 200);

comment on column public.family_debts.annual_interest_rate is
  'Yıllık nominal faiz oranı, yüzde. Kullanıcının bildirdiği oran; banka entegrasyonundan gelmez.';
