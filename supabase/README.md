# NIBRAAS – Supabase (database, RLS, Edge Function)

> **Important:** this repository cannot tell which of these files were already run in *your* Supabase
> project. Nothing here is applied automatically. Use the read-only checks below to find out, and take a
> Supabase backup (Dashboard → Database → Backups) before running anything.

## Files

| Order | File | What it does | Rollback |
|------|------|--------------|----------|
| 1 | `migrations/001_v20_tenant_isolation_base.sql` | Tables `nibraas_tenants`, `nibraas_memberships`, `app_storage.tenant_id/branch_id`, RPC `nibraas_bootstrap`, base RLS (any member of a school can read/write that school's rows) | – (base) |
| 2 | `migrations/002_tenant_registration.sql` | `nibraas_is_tenant_admin`, RPC `nibraas_register_tenant` (public school sign-up) | – |
| 3 | `migrations/003_memberships_hardening.sql` | Removes browser INSERT/UPDATE on memberships, blocks self-delete. Aborts by itself if the two SECURITY DEFINER functions are missing. | `rollback/003_…` |
| 4 | `migrations/004_role_based_storage_rls.sql` | Database enforces the role menu (finance only for Admin/Maamule/Xisaabiye, etc.) via `nibraas_key_access` | `rollback/004_…` |
| – | `functions/nibraas-admin-create-user/index.ts` | Edge Function (service role) that creates users for a school. Hardened: no password reset of existing accounts, role allow-list, no Admin escalation by Maamule. | redeploy the old version |

Run order matters: 002 re-creates membership INSERT/UPDATE policies that 003 then removes.

## Find out what is already applied (read-only, safe to run)

```sql
-- 2/4: functions present?
select proname, prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('nibraas_bootstrap','nibraas_register_tenant','nibraas_is_tenant_admin',
                  'nibraas_my_role','nibraas_key_access','nibraas_memberships_no_self_delete');

-- 3: memberships hardening applied?  (no insert/update policy + trigger present)
select policyname, cmd from pg_policies where tablename = 'nibraas_memberships' order by 1;
select tgname from pg_trigger where tgname = 'nibraas_memberships_no_self_delete';

-- 4: role-based storage rules applied?  (policy text mentions nibraas_key_access)
select policyname, cmd, qual, with_check from pg_policies where tablename = 'app_storage' order by 1;
```

How to read it: migration 004 is applied **iff** `nibraas_key_access` exists **and** the `app_storage_tenant_*`
policies mention it. Migration 003 is applied iff `membership_insert_admin` / `membership_update_admin`
are gone and the trigger exists.

## Known limits of the current design (honest notes)

* **Branch isolation is client-side only.** The branch is part of the storage key
  (`tenant:branch:key`) but RLS checks the *tenant*, not the branch. A member of a school can read the
  other branches of the same school through the API. Real branch isolation would need a per-branch
  membership table – not changed here because it is a schema change.
* **Writes are not atomic.** The app re-reads a row before writing and merges changes made by another
  device (see `src/App.jsx`, "safe storage core"), but PostgREST upsert has no compare-and-swap, so two saves
  landing within a few milliseconds can still race. Moving to a versioned column or an RPC would remove this.
* **Key prefix is not enforced by RLS.** Policies check `tenant_id`; they do not check that `key` starts with
  that tenant id. Impact is low (rows are still only visible to the tenant in `tenant_id`), but an optional
  hardening would be `check (key like tenant_id::text || ':%')` – not shipped because older rows may not
  follow the pattern.
* The 004 SQL was written against the keys the app uses today. If you add a new data key, add it to
  `nibraas_key_access`, otherwise it defaults to "readable by all members, writable by Admin/Maamule".
