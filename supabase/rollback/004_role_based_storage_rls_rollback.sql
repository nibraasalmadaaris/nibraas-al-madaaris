-- Restores the v20 behaviour: every school member can read/write every row of the school
-- (global keys: Admin only to write). Run only if the role rules cause problems.
begin;
drop policy if exists "app_storage_tenant_select" on public.app_storage;
drop policy if exists "app_storage_tenant_insert" on public.app_storage;
drop policy if exists "app_storage_tenant_update" on public.app_storage;
drop policy if exists "app_storage_tenant_delete" on public.app_storage;

create policy "app_storage_tenant_select" on public.app_storage for select to authenticated
using (tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid()));

create policy "app_storage_tenant_insert" on public.app_storage for insert to authenticated
with check (tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (split_part(key, ':', 2) <> '__global__' or exists (select 1 from public.nibraas_memberships m
       where m.user_id = auth.uid() and m.tenant_id = app_storage.tenant_id and m.role = 'Admin')));

create policy "app_storage_tenant_update" on public.app_storage for update to authenticated
using (tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (split_part(key, ':', 2) <> '__global__' or exists (select 1 from public.nibraas_memberships m
       where m.user_id = auth.uid() and m.tenant_id = app_storage.tenant_id and m.role = 'Admin')))
with check (tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (split_part(key, ':', 2) <> '__global__' or exists (select 1 from public.nibraas_memberships m
       where m.user_id = auth.uid() and m.tenant_id = app_storage.tenant_id and m.role = 'Admin')));

create policy "app_storage_tenant_delete" on public.app_storage for delete to authenticated
using (tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (split_part(key, ':', 2) <> '__global__' or exists (select 1 from public.nibraas_memberships m
       where m.user_id = auth.uid() and m.tenant_id = app_storage.tenant_id and m.role = 'Admin')));

drop function if exists public.nibraas_key_access(text, text, boolean);
drop function if exists public.nibraas_my_role(uuid);
commit;
