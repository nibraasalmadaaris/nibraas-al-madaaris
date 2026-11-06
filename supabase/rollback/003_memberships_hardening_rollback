-- Restores nibraas_memberships to how it was before 2026-10-31_memberships_hardening.sql
begin;

drop trigger if exists nibraas_memberships_no_self_delete on public.nibraas_memberships;
drop function if exists public.nibraas_memberships_no_self_delete();

drop policy if exists membership_insert_admin on public.nibraas_memberships;
create policy membership_insert_admin on public.nibraas_memberships
  as permissive for insert to authenticated
  with check (nibraas_is_tenant_admin(tenant_id));

drop policy if exists membership_update_admin on public.nibraas_memberships;
create policy membership_update_admin on public.nibraas_memberships
  as permissive for update to authenticated
  using (nibraas_is_tenant_admin(tenant_id))
  with check (nibraas_is_tenant_admin(tenant_id));

commit;
