-- =============================================================================
-- Proofly — Milestone 2 · Migration 0002
-- `public.profiles` — one row per authenticated user.
-- =============================================================================
-- This is the tenant root. Every RLS policy on `projects` and `testimonials`
-- resolves ownership by joining through `profiles`, so the correctness of the
-- whole security model depends on this table's policies being strict.
--
-- Design decision: profiles own `projects` directly rather than introducing a
-- separate `workspaces` table. The PRD describes a workspace, but for the MVP
-- it is 1:1 with the user (PRD §4.3 F-WS-1, §12 M2), so a separate table would
-- add indirection without adding capability. If team seats land later, the
-- migration path is to add `workspaces` and backfill `profiles.workspace_id`
-- — the policies are written so that swapping the ownership predicate is a
-- localized change.
--
-- Safe to run: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE policies.
-- Contains no destructive DDL.
-- =============================================================================

create table if not exists public.profiles (
  -- The auth user this profile describes. One-to-one with auth.users.
  id          uuid primary key references auth.users (id) on delete cascade,

  -- Denormalized copy of auth.users.email for display in the dashboard.
  -- Kept in sync by the signup trigger below; never treated as the
  -- authoritative credential (Supabase Auth owns passwords and email auth).
  email       extensions.citext,

  display_name text,

  -- Free-form profile metadata (avatar URL, locale). Reserved for MVP+ use.
  -- `default ( '{}'::jsonb )` plus the NOT NULL CHECK keeps jsonb_typeof
  -- provably an object so downstream code never has to guard against arrays.
  metadata    jsonb not null default '{}'::jsonb
                check (jsonb_typeof(metadata) = 'object'),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80),

  constraint profiles_email_length
    check (email is null or char_length(email::text) <= 254)
);

comment on table public.profiles is
  'One row per authenticated user. Tenant root for projects and testimonials.';

-- updated_at maintenance.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- Profiles contain PII (email, display name) so RLS is enabled unconditionally.
alter table public.profiles enable row level security;
-- Defense in depth: if the table owner or a future misconfiguration grants
-- BYPASSRLS, this revokes it from the public-facing roles. The service_role
-- key bypasses RLS by attribute in PostgREST, not by table privilege, so this
-- does not affect trusted server code.
alter table public.profiles force row level security;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
-- The model is intentionally narrow: a user may read and update ONLY their own
-- profile. There is no INSERT policy here — rows are created by the
-- `handle_new_user()` trigger (which runs as SECURITY DEFINER) or by trusted
-- server code using the service-role key. That removes any chance of a client
-- creating a profile row for a different `id`, which would otherwise be a
-- privilege-escalation primitive.
-- -----------------------------------------------------------------------------

-- SELECT: your own row only.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- UPDATE: your own row only. Columns are constrained separately below so a
-- user cannot rewrite their own `id` and, more importantly, so this policy
-- cannot be reused to touch another user's row.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- Column-level hardening
-- -----------------------------------------------------------------------------
-- Even though the policy already scopes rows to the owner, revoking UPDATE on
-- identity-bearing columns means a bug in application code cannot silently
-- rewrite them. `created_at` is frozen for the same reason.
-- -----------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (display_name, metadata) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- handle_new_user()
-- -----------------------------------------------------------------------------
-- Creates the profile row at signup time. This is a SECURITY DEFINER function
-- so it can INSERT despite there being no client INSERT policy; it is granted
-- EXECUTE only to `supabase_auth_admin`, which is the role Supabase's own
-- auth trigger machinery runs as. It is NOT granted to `authenticated` or
-- `anon`, so no client — including a user forging a JWT — can call it to
-- create rows for other accounts.
--
-- SECURITY DEFINER functions are a privilege-escalation risk if the search_path
-- is left unpinned, so `set search_path` is fixed explicitly. The function body
-- takes its input only from the NEW auth.users row, never from client input.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    -- Prefer the name captured at signup; fall back to the email local part so
    -- the dashboard always has something to render.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT trigger on auth.users that creates the matching profiles row.';

-- Attach to auth.users. `drop trigger if exists` keeps this re-runnable.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lock down EXECUTE. Without this, `authenticated` inherits the default
-- EXECUTE grant on new functions and could invoke handle_new_user() directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;