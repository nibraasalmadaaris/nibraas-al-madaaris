-- NIBRAAS: safer tenant membership policies + public school registration
-- Run only AFTER reviewing your existing migration and taking a Supabase backup.
-- This script does not delete app_storage rows.

create or replace function public.nibraas_is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nibraas_memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = auth.uid()
      and m.role = 'Admin'
  );
$$;

revoke all on function public.nibraas_is_tenant_admin(uuid) from public;
grant execute on function public.nibraas_is_tenant_admin(uuid) to authenticated;

-- Avoid recursive RLS policies that query nibraas_memberships from its own policy.
drop policy if exists "membership_select_own_or_admin" on public.nibraas_memberships;
create policy "membership_select_own_or_admin"
on public.nibraas_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or public.nibraas_is_tenant_admin(tenant_id)
);

drop policy if exists "membership_insert_admin" on public.nibraas_memberships;
create policy "membership_insert_admin"
on public.nibraas_memberships
for insert to authenticated
with check (public.nibraas_is_tenant_admin(tenant_id));

drop policy if exists "membership_update_admin" on public.nibraas_memberships;
create policy "membership_update_admin"
on public.nibraas_memberships
for update to authenticated
using (public.nibraas_is_tenant_admin(tenant_id))
with check (public.nibraas_is_tenant_admin(tenant_id));

drop policy if exists "membership_delete_admin" on public.nibraas_memberships;
create policy "membership_delete_admin"
on public.nibraas_memberships
for delete to authenticated
using (public.nibraas_is_tenant_admin(tenant_id));

-- Registration RPC: call only after Supabase Auth has created/authenticated the user.
-- A new tenant is created for each registering user; existing memberships are returned unchanged.
create or replace function public.nibraas_register_tenant(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t uuid;
  clean_name text := nullif(trim(p_name), '');
begin
  if uid is null then
    raise exception 'Waa inaad marka hore gashaa akoonka.';
  end if;

  if clean_name is null or length(clean_name) > 120 then
    raise exception 'Geli magaca madrasadda (1 ilaa 120 xaraf).';
  end if;

  -- Do not let an existing user create repeated tenants by calling the RPC again.
  select tenant_id into t
  from public.nibraas_memberships
  where user_id = uid
  limit 1;

  if t is not null then
    return t;
  end if;

  insert into public.nibraas_tenants(name)
  values (clean_name)
  returning id into t;

  insert into public.nibraas_memberships(tenant_id, user_id, role)
  values (t, uid, 'Admin');

  return t;
end;
$$;

revoke all on function public.nibraas_register_tenant(text) from public;
grant execute on function public.nibraas_register_tenant(text) to authenticated;

-- Note: This migration intentionally does NOT alter the existing bootstrap function
-- or move legacy app_storage data. Keep legacy-data migration separate and back it up first.
