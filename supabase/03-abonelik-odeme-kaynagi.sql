-- Pamuk Eller: aboneliklerin tahsil edildiği hesap/kart etiketini sakla.
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştır.
alter table public.family_bills
  add column if not exists payment_source text;

comment on column public.family_bills.payment_source is
  'Aboneliğin tahsil edildiği banka hesabı veya kullanıcının verdiği kart etiketi; hassas kart bilgisi içermez.';
