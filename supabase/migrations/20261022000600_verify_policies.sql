-- =============================================================================
-- Proofly — Milestone 2 · Migration 0006 (read-only audit helpers)
-- Introspection queries to VERIFY that RLS and policies were applied correctly.
-- =============================================================================
-- These are SELECT-only and change nothing. They are provided so the engineer
-- applying the migrations can confirm the security posture after running
-- migrations 0001–0005. Run each and check the expected output documented in
-- docs/MILESTONE-2.md.
--
-- NOTE: These queries must be run as a role that can see pg_policy (the
-- postgres/service role). They are for verification, not application use.
-- =============================================================================

-- 1. Confirm RLS is ENABLED and FORCED on every application table.
--    Expected: 3 rows, each with rowsecurity = true AND forcerowsecurity = true.
select
  c.relname                                as table_name,
  c.relrowsecurity                         as rls_enabled,
  c.relforcerowsecurity                    as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles', 'projects', 'testimonials')
order by c.relname;

-- 2. List every policy and what it permits, for a human-readable security
--    review. Expected roles for anon: SELECT on published/approved only plus
--    INSERT on testimonials. Expected for authenticated: owner-scoped CRUD.
select
  tablename                as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual                     as using_expr,
  with_check               as check_expr
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Confirm there is NO anon UPDATE or DELETE policy on testimonials.
--    Expected: zero rows. If any row appears, the public form could mutate
--    or delete data and the schema is wrong.
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'testimonials'
  and 'anon' = any (roles)
  and cmd in ('UPDATE', 'DELETE');

-- 4. Confirm the privileged functions are SECURITY INVOKER (not DEFINER),
--    so they cannot bypass RLS. Expected proconfig for security is null in
--    pg_proc.proconfig; we check prosecdef = false for both helpers.
select
  p.proname,
  p.prosecdef             as security_definer_should_be_false
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_public_project_by_slug', 'get_public_testimonials');

-- 5. Confirm handle_new_user is SECURITY DEFINER but EXECUTE is revoked from
--    anon/authenticated. Expected: handle_new_user.prosecdef = true, and the
--    EXECUTE query below returns zero rows for anon/authenticated.
select
  p.proname,
  p.prosecdef             as is_security_definer_should_be_true
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user';

-- 5b. handle_new_user must NOT be executable by anon/authenticated.
--      Expected: zero rows.
select
  r.rolname,
  has_function_privilege(
    r.rolname,
    'public.handle_new_user()',
    'EXECUTE'
  ) as can_execute_should_be_false
from (values ('anon'), ('authenticated')) as r(rolname)
where has_function_privilege(r.rolname, 'public.handle_new_user()', 'EXECUTE');