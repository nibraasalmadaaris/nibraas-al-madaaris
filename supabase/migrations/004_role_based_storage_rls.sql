-- NIBRAAS: role-based access to app_storage (finance, payroll, parents, ... by role)
-- Run AFTER 2026-10-31_memberships_hardening.sql. Take a Supabase backup first.
-- Rollback: 2026-11-03_role_based_storage_rls_rollback.sql
--
-- Before this, every member of a school could read/write ALL of that school's rows through the API.
-- Now the database enforces the same rules as the app menu. The rules live in ONE function
-- (nibraas_key_access) so they are easy to read and change.
--
--   key group                                        read                 write
--   finance-data, invoices-data, payroll-data        Admin Maamule Xisaabiye   same
--   parents / sms / parent-communication / templates Admin Maamule             same
--   complaints-data                                  Admin Maamule Shaqaale    same
--   attendance-*  , students-data                    everyone             Admin Maamule Macalin Shaqaale
--   activities-data                                  everyone             Admin Maamule Macalin Shaqaale
--   classes, subjects, timetable, daily-tasks, achievements, progress, academic-progress,
--   quran-progress, exams, exam-results              everyone             Admin Maamule Macalin
--   employees-data and any other key                 everyone             Admin Maamule
--   user-profiles / config-data / branches-data      everyone             Admin only (unchanged)

begin;

create or replace function public.nibraas_my_role(p_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.nibraas_memberships m
  where m.tenant_id = p_tenant_id and m.user_id = auth.uid()
  limit 1;
$$;
revoke all on function public.nibraas_my_role(uuid) from public;
grant execute on function public.nibraas_my_role(uuid) to authenticated;

-- physical key is  <tenant>:<scope>:<logical key>
create or replace function public.nibraas_key_access(p_key text, p_role text, p_write boolean)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  k text := regexp_replace(p_key, '^[^:]*:[^:]*:', '');
begin
  if p_role is null then return false; end if;
  if p_role = 'Admin' then return true; end if;

  if k in ('finance-data', 'invoices-data', 'payroll-data') then
    return p_role in ('Maamule', 'Xisaabiye');
  end if;
  if k in ('parents-data', 'sms-log', 'parent-communication-log', 'parent-message-templates') then
    return p_role = 'Maamule';
  end if;
  if k = 'complaints-data' then
    return p_role in ('Maamule', 'Shaqaale');
  end if;

  if not p_write then return true; end if;   -- everything else is readable by every member

  if k = 'students-data' or k = 'activities-data' or k like 'attendance-%' then
    return p_role in ('Maamule', 'Macalin', 'Shaqaale');
  end if;
  if k in ('classes-data', 'subjects-data', 'timetable-data', 'daily-tasks-data', 'achievements-data',
           'progress-data', 'academic-progress-data', 'quran-progress-data', 'exams-data', 'exam-results-data')
     or k like 'timetable-%' or k like 'jadwal-%' then
    return p_role in ('Maamule', 'Macalin');
  end if;
  return p_role = 'Maamule';
end;
$$;

-- Replace the four tenant policies, keeping tenant isolation and the Admin-only rule for global keys.
drop policy if exists "app_storage_tenant_select" on public.app_storage;
drop policy if exists "app_storage_tenant_insert" on public.app_storage;
drop policy if exists "app_storage_tenant_update" on public.app_storage;
drop policy if exists "app_storage_tenant_delete" on public.app_storage;

create policy "app_storage_tenant_select" on public.app_storage
for select to authenticated
using (public.nibraas_key_access(key, public.nibraas_my_role(tenant_id), false));

create policy "app_storage_tenant_insert" on public.app_storage
for insert to authenticated
with check (
  public.nibraas_key_access(key, public.nibraas_my_role(tenant_id), true)
  and (split_part(key, ':', 2) <> '__global__' or public.nibraas_my_role(tenant_id) = 'Admin')
);

create policy "app_storage_tenant_update" on public.app_storage
for update to authenticated
using (
  public.nibraas_key_access(key, public.nibraas_my_role(tenant_id), true)
  and (split_part(key, ':', 2) <> '__global__' or public.nibraas_my_role(tenant_id) = 'Admin')
)
with check (
  public.nibraas_key_access(key, public.nibraas_my_role(tenant_id), true)
  and (split_part(key, ':', 2) <> '__global__' or public.nibraas_my_role(tenant_id) = 'Admin')
);

create policy "app_storage_tenant_delete" on public.app_storage
for delete to authenticated
using (
  public.nibraas_key_access(key, public.nibraas_my_role(tenant_id), true)
  and (split_part(key, ':', 2) <> '__global__' or public.nibraas_my_role(tenant_id) = 'Admin')
);

commit;
