-- =============================================================================
-- Proofly — Milestone 2 · Migration 0001
-- Extensions and shared helper functions.
-- =============================================================================
-- Safe to run: only creates extensions/function OR REPLACES existing ones
-- with identical bodies. Does not touch application tables or data.
--
-- Conventions used across all Proofly migrations:
--   * Tables live in the `public` schema.
--   * Primary keys are `uuid` with `gen_random_uuid()` (pgcrypto / built-in on
--     Supabase Postgres 15+).
--   * Timestamps are `timestamptz` in UTC, maintained by `set_updated_at()`.
--   * Slugs and emails that are compared case-insensitively use `citext`.
-- =============================================================================

-- The `extensions` schema hosts third-party types (citext, pgcrypto's gen_*).
-- It exists by default on Supabase projects, but is created here FIRST so this
-- migration also runs on a vanilla Postgres instance used for local testing.
-- It must exist before the `with schema extensions` clauses below.
create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- Supabase's `auth.users` lives in the `auth` schema, which we treat as
-- read-only. Every reference to it is an FK with ON DELETE CASCADE so that
-- deleting an auth user cleans up their application rows.

-- -----------------------------------------------------------------------------
-- set_updated_at()
-- -----------------------------------------------------------------------------
-- A generic BEFORE UPDATE trigger function that stamps `updated_at`.
-- Used by every mutable table so application code never has to remember to
-- set the column by hand.
--
-- NOTE ON `now()` vs `timezone('utc', now())`:
-- `now()` already returns a `timestamptz` (an absolute instant) and is the
-- correct value to assign to a timestamptz column. `timezone('utc', now())`
-- *drops the zone*, yielding a bare `timestamp`, which Postgres then
-- reinterprets in the session TimeZone — shifting the stored instant whenever
-- the server is not running in UTC. Do not use that idiom on timestamptz
-- columns anywhere in this schema.
--
-- SECURITY: trigger functions run with the privileges of the invoking role by
-- default; because this only writes NEW.updated_at it cannot be used to
-- escalate privileges. It performs no dynamic SQL and takes no arguments from
-- user input.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger that stamps NEW.updated_at with the current time.';

-- -----------------------------------------------------------------------------
-- current_user_id()
-- -----------------------------------------------------------------------------
-- Returns the authenticated user's id from the JWT, or NULL for anonymous
-- requests. Wrapped so that policies read cleanly and so there is exactly one
-- place where the JWT claim is interpreted.
--
-- SECURITY: reads `auth.uid()`, which Supabase derives from the verified JWT.
-- There is no path for a client to influence this value other than by
-- successfully authenticating.
-- -----------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

comment on function public.current_user_id() is
  'The authenticated user id (auth.uid()), or NULL when anonymous.';