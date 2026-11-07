-- NIBRAAS: tighten public.nibraas_memberships
-- Run on a copy / staging project first. Rollback is in 2026-10-31_memberships_hardening_rollback.sql
--
-- Why:
--  * The browser app never INSERTs or UPDATEs memberships. Those writes happen in
--    the nibraas-admin-create-user Edge Function (service role, which bypasses RLS) and in the
--    SECURITY DEFINER functions nibraas_bootstrap / nibraas_register_tenant.
--    The INSERT/UPDATE policies therefore only let an Admin edit memberships by hand,
--    skipping the rules the Edge Function enforces (own-row protection, other-school accounts).
--  * An Admin could delete their own membership and leave the school with no Admin.

begin;

-- Safety check: the two functions that legitimately write memberships must run as their owner.
-- If this fails, do NOT continue: dropping the policies could break first login / school sign-up.
do $$
declare n int;
begin
  select count(*) into n
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public'
    and p.proname in ('nibraas_bootstrap', 'nibraas_register_tenant')
    and p.prosecdef;
  if n <> 2 then
    raise exception 'nibraas_bootstrap and nibraas_register_tenant must both exist and be SECURITY DEFINER (found %). Aborting.', n;
  end if;
end $$;

-- 1) No direct browser writes except DELETE (the Users screen removes members that way).
drop policy if exists membership_insert_admin on public.nibraas_memberships;
drop policy if exists membership_update_admin on public.nibraas_memberships;

-- 2) An Admin cannot delete their own membership from the browser.
--    Skipped for service role / SQL editor (auth.uid() is null) and for cascades
--    (deleting a school or an auth user), which run at trigger depth > 1.
create or replace function public.nibraas_memberships_no_self_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 or auth.uid() is null then
    return old;
  end if;
  if old.user_id = auth.uid() then
    raise exception 'Ma tirtiri kartid membership-kaaga'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists nibraas_memberships_no_self_delete on public.nibraas_memberships;
create trigger nibraas_memberships_no_self_delete
  before delete on public.nibraas_memberships
  for each row execute function public.nibraas_memberships_no_self_delete();

commit;
