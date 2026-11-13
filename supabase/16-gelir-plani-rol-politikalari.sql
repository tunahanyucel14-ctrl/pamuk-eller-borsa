-- Gelir planları: yönetici tüm kayıtları, editör yalnızca kendi kaydını güncelleyebilir.
-- Eklemede created_by oturumdaki kullanıcıyla eşleşmeli; silme yöneticiye aittir.
drop policy if exists income_rules_insert on public.family_income_rules;
create policy income_rules_insert on public.family_income_rules
for insert to authenticated
with check (private.family_can_write(family_id) and created_by = (select auth.uid()));

drop policy if exists income_rules_update on public.family_income_rules;
create policy income_rules_update on public.family_income_rules
for update to authenticated
using (private.family_can_manage(family_id) or (private.family_can_write(family_id) and created_by = (select auth.uid())))
with check (private.family_can_manage(family_id) or (private.family_can_write(family_id) and created_by = (select auth.uid())));

drop policy if exists income_rules_delete on public.family_income_rules;
create policy income_rules_delete on public.family_income_rules
for delete to authenticated using (private.family_can_manage(family_id));