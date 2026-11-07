-- NIBRAAS v20 — Security + Tenant/Branch Isolation
-- Run this ONCE in Supabase SQL Editor.
-- It keeps existing app_storage data and gives the first logged-in account
-- ownership of the existing legacy data.

create extension if not exists pgcrypto;

create table if not exists public.nibraas_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'NIBRAAS',
  created_at timestamptz not null default now()
);

create table if not exists public.nibraas_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.nibraas_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Admin' check (role in ('Admin','Maamule','Macalin','Xisaabiye','Shaqaale')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

alter table public.app_storage add column if not exists tenant_id uuid;
alter table public.app_storage add column if not exists branch_id text not null default 'main';

-- Create the first tenant for legacy data only when no tenant exists yet.
do $$
declare
  t uuid;
begin
  if not exists (select 1 from public.nibraas_tenants) then
    insert into public.nibraas_tenants(name) values ('NIBRAAS') returning id into t;
    -- The tenant will be connected to the first real logged-in user by the RPC below.
  end if;
end $$;

create or replace function public.nibraas_bootstrap()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t uuid;
  existing_tenant uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select tenant_id into existing_tenant
  from public.nibraas_memberships
  where user_id = uid
  limit 1;

  if existing_tenant is not null then
    return existing_tenant;
  end if;

  -- Only the very first authenticated account may bootstrap the tenant.
  -- Later users must be added by an existing Admin through Users & Roles.
  if exists (select 1 from public.nibraas_memberships) then
    raise exception 'User-kan NIBRAAS tenant-kan xubin kama aha';
  end if;

  select id into t
  from public.nibraas_tenants
  order by created_at
  limit 1;

  if t is null then
    insert into public.nibraas_tenants(name) values ('NIBRAAS') returning id into t;
  end if;

  insert into public.nibraas_memberships(tenant_id, user_id, role)
  values (t, uid, 'Admin');

  update public.app_storage
  set tenant_id = t,
      branch_id = case when key in ('user-profiles','config-data','branches-data') then '__global__' else 'main' end,
      key = t::text || ':' ||
            case when key in ('user-profiles','config-data','branches-data') then '__global__' else 'main' end || ':' || key
  where tenant_id is null;

  return t;
end;
$$;

revoke all on function public.nibraas_bootstrap() from public;
grant execute on function public.nibraas_bootstrap() to authenticated;

-- Keep the existing primary key on key. The application will namespace the physical
-- key as tenant-id:branch-id:logical-key, which avoids a destructive primary-key
-- migration while still allowing multiple schools to store the same logical key.

alter table public.nibraas_tenants enable row level security;
alter table public.nibraas_memberships enable row level security;
alter table public.app_storage enable row level security;

drop policy if exists "tenant_select_own" on public.nibraas_tenants;
create policy "tenant_select_own"
on public.nibraas_tenants
for select to authenticated
using (
  id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
);

drop policy if exists "membership_select_own_or_admin" on public.nibraas_memberships;
create policy "membership_select_own_or_admin"
on public.nibraas_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.nibraas_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = nibraas_memberships.tenant_id
      and m.role = 'Admin'
  )
);

drop policy if exists "membership_insert_admin" on public.nibraas_memberships;
create policy "membership_insert_admin"
on public.nibraas_memberships
for insert to authenticated
with check (
  exists (
    select 1 from public.nibraas_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = nibraas_memberships.tenant_id
      and m.role = 'Admin'
  )
);

drop policy if exists "membership_update_admin" on public.nibraas_memberships;
create policy "membership_update_admin"
on public.nibraas_memberships
for update to authenticated
using (
  exists (
    select 1 from public.nibraas_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = nibraas_memberships.tenant_id
      and m.role = 'Admin'
  )
)
with check (
  exists (
    select 1 from public.nibraas_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = nibraas_memberships.tenant_id
      and m.role = 'Admin'
  )
);

drop policy if exists "membership_delete_admin" on public.nibraas_memberships;
create policy "membership_delete_admin"
on public.nibraas_memberships
for delete to authenticated
using (
  exists (
    select 1 from public.nibraas_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = nibraas_memberships.tenant_id
      and m.role = 'Admin'
  )
);

-- Storage is isolated by tenant. Branch is part of the same tenant policy;
-- users cannot read/write another school's rows.
drop policy if exists "app_storage_select" on public.app_storage;
drop policy if exists "app_storage_insert" on public.app_storage;
drop policy if exists "app_storage_update" on public.app_storage;
drop policy if exists "app_storage_delete" on public.app_storage;

drop policy if exists "app_storage_tenant_select" on public.app_storage;
create policy "app_storage_tenant_select"
on public.app_storage
for select to authenticated
using (
  tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
);

drop policy if exists "app_storage_tenant_insert" on public.app_storage;
create policy "app_storage_tenant_insert"
on public.app_storage
for insert to authenticated
with check (
  tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (
    split_part(key, ':', 2) <> '__global__'
    or exists (
      select 1 from public.nibraas_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = app_storage.tenant_id
        and m.role = 'Admin'
    )
  )
);

drop policy if exists "app_storage_tenant_update" on public.app_storage;
create policy "app_storage_tenant_update"
on public.app_storage
for update to authenticated
using (
  tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (
    split_part(key, ':', 2) <> '__global__'
    or exists (
      select 1 from public.nibraas_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = app_storage.tenant_id
        and m.role = 'Admin'
    )
  )
)
with check (
  tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (
    split_part(key, ':', 2) <> '__global__'
    or exists (
      select 1 from public.nibraas_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = app_storage.tenant_id
        and m.role = 'Admin'
    )
  )
);

drop policy if exists "app_storage_tenant_delete" on public.app_storage;
create policy "app_storage_tenant_delete"
on public.app_storage
for delete to authenticated
using (
  tenant_id in (select tenant_id from public.nibraas_memberships where user_id = auth.uid())
  and (
    split_part(key, ':', 2) <> '__global__'
    or exists (
      select 1 from public.nibraas_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = app_storage.tenant_id
        and m.role = 'Admin'
    )
  )
);

create index if not exists app_storage_tenant_branch_idx
on public.app_storage(tenant_id, branch_id);

create index if not exists memberships_user_idx
on public.nibraas_memberships(user_id);

create index if not exists memberships_tenant_idx
on public.nibraas_memberships(tenant_id);
