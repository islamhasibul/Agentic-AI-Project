-- =============================================================================
-- Proofly — Milestone 2 · Migration 0007
-- Restrict anonymous SELECT on `public.testimonials` to public columns only.
-- =============================================================================
-- WHY THIS EXISTS
-- ---------------
-- Anonymous callers need exactly two things on `public.testimonials`:
--   1. INSERT a pending submission (the public collection form), and
--   2. nothing else.
--
-- The public wall does NOT read this table directly. It calls
-- `get_public_testimonials(uuid)` (migration 0005), a SECURITY INVOKER
-- function that pins its own column list. So the table-level SELECT held by
-- `anon` served no purpose in the application — it only widened what an
-- attacker could reach by bypassing the app and querying PostgREST directly
-- with the anon key that ships in the client bundle.
--
-- PostgREST evaluates table-level privilege BEFORE RLS, so with table-level
-- SELECT present, `anon` reached `public.testimonials` directly. The RLS
-- policy `testimonials_select_approved_public` filters ROWS (approved, and
-- parent published) but cannot filter COLUMNS. A request such as
--
--   GET /rest/v1/testimonials?select=author_email,content&status=eq.approved
--
-- therefore returned every approved testimonial's submitter email alongside
-- their public quote. GDPR exposure on a product whose entire public surface
-- is, by definition, testimonials.
--
-- WHY ALLOWLIST RATHER THAN A 3-COLUMN REVOKE
-- --------------------------------------------
-- Revoking only (author_email, submitted_by, moderated_by) would fix today's
-- exposure but leave `anon` reading the table through a broad column grant:
-- any column added to that grant later would be public by default. This
-- migration instead grants SELECT on an explicit list of the 10 columns the
-- public surface legitimately needs, so a future column is DENIED until
-- deliberately added. Fail-closed beats fail-open.
--
-- WHAT IS DELIBERATELY UNCHANGED
-- -------------------------------
--   * INSERT for anon is preserved — the collection form still works.
--   * RLS policies are untouched. `testimonials_select_approved_public` and
--     `testimonials_insert_anonymous` keep working exactly as before.
--   * `get_public_testimonials` stays SECURITY INVOKER. It is NOT promoted to
--     SECURITY DEFINER: a DEFINER function reading these tables would run with
--     the definer's privileges and could bypass RLS entirely.
--   * `authenticated` keeps its full row access, so the owner dashboard can
--     still read `author_email` (see OWNER_TESTIMONIAL_COLUMNS in
--     lib/supabase/types.ts) and moderation is unaffected.
--
-- IDEMPOTENCE
-- -----------
-- REVOKE then GRANT is convergent: re-running produces the same privilege set
-- regardless of the starting state, so this file is safe to run repeatedly and
-- safe to apply to a database that never saw migration 0004.
--
-- Safe to run: GRANT/REVOKE only. No data change, no policy change, no DDL.
-- =============================================================================

revoke select on table public.testimonials from anon;

grant select (
  id, project_id, author_name, author_role, author_company,
  content, status, featured, helpful_count, created_at
) on table public.testimonials to anon;

grant insert on table public.testimonials to anon;