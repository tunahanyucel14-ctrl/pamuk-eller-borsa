-- BORSA TABLOLARI İÇİN OKUMA KURALLARI
-- Daha önce çalıştırdıysan "already exists" hatası alırsın, sorun değil, atla.

create policy "profiller_okuma" on public.profiles for select to authenticated using (true);
create policy "hisseler_okuma" on public.stocks for select to anon, authenticated using (true);
create policy "sezonlar_okuma" on public.seasons for select to anon, authenticated using (true);
create policy "portfoy_kendi_okuma" on public.portfolios for select to authenticated using (auth.uid() = user_id);
create policy "islemler_kendi_okuma" on public.transactions for select to authenticated using (auth.uid() = user_id);

-- Erişim izinleri (satır bazlı kontrolü yukarıdaki kurallar yapar)
grant select on public.stocks, public.seasons to anon, authenticated;
grant select on public.profiles, public.portfolios, public.transactions to authenticated;
