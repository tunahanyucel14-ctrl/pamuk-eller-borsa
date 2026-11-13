-- Borsa tablolarında yinelenen SELECT politikalarını kaldır ve auth.uid() çağrılarını sabitle.
drop policy if exists "portfoy_kendi_okuma" on public.portfolios;
drop policy if exists "Users view own portfolio" on public.portfolios;
create policy "portfoy_kendi_okuma" on public.portfolios
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Profiles are viewable" on public.profiles;
drop policy if exists "Seasons are viewable" on public.seasons;
drop policy if exists "Stocks are viewable" on public.stocks;
drop policy if exists "Users view own transactions" on public.transactions;
drop policy if exists "islemler_kendi_okuma" on public.transactions;
create policy "islemler_kendi_okuma" on public.transactions
  for select to authenticated
  using ((select auth.uid()) = user_id);
