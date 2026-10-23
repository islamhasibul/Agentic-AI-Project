-- =============================================================================
-- Proofly — Milestone 2 · Migration 0005
-- Public wall read helpers.
-- =============================================================================
-- The public wall at /w/{wallSlug} needs two reads:
--   1. Resolve a project by slug, and only if it is published.
--   2. Fetch that project's approved testimonials, without author_email.
--
-- Both are implemented as SECURITY INVOKER (the default) SQL functions rather
-- than SECURITY DEFINER. This matters: a SECURITY DEFINER function that reads
-- `projects`/`testimonials` would run with the definer's privileges and could
-- be used to bypass RLS entirely, handing every caller the service-role view.
-- SECURITY INVOKER keeps RLS fully in force, so these helpers are *narrowed*
-- by policy rather than being an escape hatch.
--
-- Granting EXECUTE to `anon` on an invoker function is safe: the caller's own
-- RLS context still applies on every row the function touches.
--
-- Safe to run: CREATE OR REPLACE + GRANT/REVOKE only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_public_project_by_slug(slug)
-- -----------------------------------------------------------------------------
-- Returns the project row for a slug, but only when it is published.
-- For an unpublished slug this returns NULL, which the route turns into a 404.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_project_by_slug(project_slug text)
returns table (
  id          uuid,
  slug        extensions.citext,
  name        text,
  description text,
  cta_label   text,
  cta_url     text,
  created_at  timestamptz
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select p.id, p.slug, p.name, p.description, p.cta_label, p.cta_url, p.created_at
  from public.projects p
  where p.slug = project_slug
    and p.is_published = true
  limit 1;
$$;

comment on function public.get_public_project_by_slug(text) is
  'Returns a published project by slug, or no rows if it does not exist / is not published.';

-- -----------------------------------------------------------------------------
-- get_public_testimonials(project_uuid)
-- -----------------------------------------------------------------------------
-- Returns approved testimonials for a project, featured-first then newest.
--
-- SECURITY: SECURITY INVOKER. RLS's public SELECT policy (status = 'approved')
-- and the column grants (no author_email for anon) both still apply. This
-- function does NOT and CANNOT widen access; it only pins the column list and
-- the ordering so application code cannot accidentally select author_email.
--
-- SECURITY INVOKER + explicit column list is belt-and-braces: even if a future
-- policy were loosened to expose more rows, this function would still only
-- surface approved content columns.
-- -----------------------------------------------------------------------------
create or replace function public.get_public_testimonials(project_uuid uuid)
returns table (
  id            uuid,
  project_id    uuid,
  author_name   text,
  author_role   text,
  author_company text,
  content       text,
  status        text,
  featured      boolean,
  helpful_count integer,
  created_at    timestamptz
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    t.id,
    t.project_id,
    t.author_name,
    t.author_role,
    t.author_company,
    t.content,
    t.status,
    t.featured,
    t.helpful_count,
    t.created_at
  from public.testimonials t
  where t.project_id = project_uuid
    and t.status = 'approved'
  order by t.featured desc, t.created_at desc;
$$;

comment on function public.get_public_testimonials(uuid) is
  'Approved testimonials for a project, featured first then newest. Public-safe columns only.';

-- -----------------------------------------------------------------------------
-- Privileges on the helper functions
-- -----------------------------------------------------------------------------
-- By default, `anon` and `authenticated` inherit EXECUTE on new functions.
-- These two are intentionally callable by both so the public wall and the
-- owner dashboard can share them. They are SECURITY INVOKER, so EXECUTE grants
-- no additional data access beyond what the caller's RLS already permits.
revoke execute on function public.get_public_project_by_slug(text) from public;
grant execute on function public.get_public_project_by_slug(text) to anon, authenticated;

revoke execute on function public.get_public_testimonials(uuid) from public;
grant execute on function public.get_public_testimonials(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Supabase realtime / PostgREST exposure
-- -----------------------------------------------------------------------------
-- We do NOT grant SELECT to anon on the full `testimonials` table columns via
-- these functions; instead the app should call the RPC (PostgREST
-- /rest/v1/rpc/get_public_testimonials). If the app instead queries the table
-- directly, it MUST select an explicit column list omitting author_email — the
-- anon role has no SELECT grant on that column.