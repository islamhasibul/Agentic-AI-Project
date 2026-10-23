-- =============================================================================
-- Proofly — Milestone 2 · Migration 0003
-- `public.projects` — walls, owned by a profile.
-- =============================================================================
-- Naming: the application/UI calls these "projects" (see lib/demo-data.ts and
-- app/dashboard/projects/*), while the PRD and the public URL scheme call them
-- "walls" (/w/[wallSlug]). This table is named `projects` to match the
-- codebase; the PRD's `walls` name is recorded here so the two vocabularies
-- stay reconcilable. Column names follow the frontend `Project` interface.
--
-- Public/private boundary: a project is publicly *visible* only when
-- `is_published = true`. Unpublished projects are private drafts. Note this is
-- distinct from publishing its *content* — a published project can still have
-- every testimonial in `pending`, in which case the public wall renders empty.
--
-- Safe to run: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE policies.
-- =============================================================================

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),

  -- Owner. ON DELETE CASCADE means deleting the auth user (and therefore the
  -- profile) removes their projects and, transitively, their testimonials.
  profile_id  uuid not null references public.profiles (id) on delete cascade,

  -- Public URL key: /w/{slug}. Case-insensitive and globally unique so that
  -- two tenants can never collide on the same public path.
  slug        extensions.citext not null,

  name        text not null,
  description text,

  -- Optional CTA shown at the bottom of the public wall (PRD F-PUB-4).
  cta_label   text,
  cta_url     text,

  -- Public visibility switch. Only owners can change it.
  is_published boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint projects_slug_format
    -- URL-safe slug: lowercase alphanumerics and hyphens, no leading/trailing
    -- hyphen, 3-64 chars. Enforced at the DB so a bad slug can never reach the
    -- public URL even if the app's validation is bypassed.
    check (
      slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and char_length(slug::text) between 3 and 64
    ),

  constraint projects_name_length
    check (char_length(name) between 1 and 120),

  constraint projects_description_length
    check (description is null or char_length(description) <= 2000),

  constraint projects_cta_label_length
    check (cta_label is null or char_length(cta_label) between 1 and 60),

  -- Only allow http(s) CTA links. Blocks `javascript:` and `data:` URLs, which
  -- would otherwise become stored XSS once rendered on the public wall.
  constraint projects_cta_url_safe
    check (
      cta_url is null
      or (
        cta_url ~* '^https?://[^[:space:]]+$'
        and char_length(cta_url) <= 2048
      )
    ),

  -- The CTA label and URL are a pair: a label without a destination (or the
  -- reverse) renders as a broken control.
  constraint projects_cta_pair
    check ((cta_label is null) = (cta_url is null))
);

comment on table public.projects is
  'Walls. Each project is owned by one profile and exposes a public /w/{slug} route.';

-- Globally unique public slug (case-insensitive via citext).
create unique index if not exists projects_slug_key
  on public.projects (slug);

-- Owner lookup: listing "my projects" is the single most common dashboard query.
create index if not exists projects_profile_id_idx
  on public.projects (profile_id);

-- Public wall rendering filters on slug then selects published rows; this
-- composite index keeps that lookup index-only.
create index if not exists projects_published_slug_idx
  on public.projects (slug)
  where is_published = true;

-- updated_at maintenance.
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.projects force row level security;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
-- Summary of the trust boundary on this table:
--   anonymous  → SELECT published rows only
--   owner      → full control of their own rows
--   anyone else→ no access
-- -----------------------------------------------------------------------------

-- Anonymous/authenticated SELECT of published walls.
--
-- This exposes title, description, slug and CTA publicly — which is the
-- intended behavior of a public wall (PRD F-PUB-1, §8.3). It does NOT expose
-- any testimonial content; that is gated on `testimonials` separately, and only
-- for approved rows.
--
-- `to anon, authenticated` is intentional: both roles need to resolve a
-- public wall by slug, and the row-level predicate is identical for them.
drop policy if exists projects_select_published on public.projects;
create policy projects_select_published
  on public.projects
  for select
  to anon, authenticated
  using (is_published = true);

-- Owners can also SELECT their own unpublished drafts.
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
  on public.projects
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

-- INSERT: a new project must be owned by the caller.
--
-- The WITH CHECK is what makes the policy safe. Without it, a user could INSERT
-- a row with somebody else's profile_id and then gain owner access to it.
drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
  on public.projects
  for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

-- UPDATE: USING scopes which existing rows may be touched; WITH CHECK stops a
-- user from transferring ownership by editing profile_id.
drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
  on public.projects
  for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

-- DELETE: owner only.
drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
  on public.projects
  for delete
  to authenticated
  using ((select auth.uid()) = profile_id);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
-- RLS is the primary control; grants decide whether a role may reach the table
-- at all. anon/authenticated need SELECT (for public walls) and full DML scoped
-- by the policies above.
revoke all on public.projects from anon, authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

-- Freeze the identity and bookkeeping columns. Even though the policies scope
-- rows to the owner, revoking column-level UPDATE means no application bug can
-- rewrite `id`, `profile_id`, or `created_at`.
revoke update on public.projects from authenticated;
grant update (slug, name, description, cta_label, cta_url, is_published)
  on public.projects to authenticated;