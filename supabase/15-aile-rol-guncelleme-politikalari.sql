-- Aile finans kayıtlarında rol bazlı güncelleme:
-- Owner/admin ailedeki tüm kayıtları güncelleyebilir.
-- Editor yalnızca kendi oluşturduğu kaydı güncelleyebilir.
-- Silme yetkileri ayrı DELETE politikalarıyla yönetilir.

do $$
declare t text;
begin
  foreach t in array array['family_debts','family_bills','family_goals','family_investments'] loop
    execute format('drop policy if exists family_update on public.%I',t);
    execute format(
      'create policy family_update on public.%I for update to authenticated using (private.family_can_manage(family_id) or (private.family_can_write(family_id) and created_by = (select auth.uid()))) with check (private.family_can_manage(family_id) or (private.family_can_write(family_id) and created_by = (select auth.uid())))',
      t
    );
  end loop;
end $$;
