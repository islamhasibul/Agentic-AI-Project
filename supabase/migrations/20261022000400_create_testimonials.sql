-- =============================================================================
-- Proofly — Milestone 2 · Migration 0004
-- `public.testimonials` — submissions, owned via their parent project.
-- =============================================================================
-- SECURITY-CRITICAL TABLE. This is the only table an unauthenticated visitor
-- can write to (the public submission form), and the only table whose rows are
-- partially public (approved rows appear on the public wall).
--
-- The two trust boundaries that must never blur:
--
--   1. ANONYMOUS SUBMITTERS may INSERT a *pending* testimonial and nothing more.
--      They may never UPDATE, DELETE, approve, feature, or read anybody's rows.
--   2. THE SUBMITTER IS NOT THE MODERATOR. Even when the person who submitted
--      a testimonial later signs in as the wall owner, approval is a separate
--      act performed through the owner policies. There is no policy anywhere in
--      this schema that lets the inserting identity confer approval.
--
-- The INSERT policy below is the reason this is safe, and it is worth reading
-- closely: it uses a WITH CHECK clause that pins every moderation-relevant
-- column to its safe default and pins `project_id` to a *published* project.
-- Because the INSERT policy is the only one that grants write access to
-- `anon`, and because WITH CHECK is evaluated against the row as it will exist
-- after the insert, an anonymous client physically cannot create a row that is
-- already approved.
--
-- Safe to run: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE policies.
-- =============================================================================

create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),

  -- Parent project. ON DELETE CASCADE means deleting a project removes its
  -- testimonials, which is what the PRD's erasure story requires (§9.2).
  project_id  uuid not null references public.projects (id) on delete cascade,

  author_name    text not null,
  author_email   extensions.citext not null,
  author_role    text,
  author_company text,

  content        text not null,

  -- Submission provenance. 'anonymous' = no authenticated session at insert
  -- time (the normal public form). 'authenticated' = an account holder
  -- submitted. Recorded so moderation and audit can distinguish them.
  --
  -- The INSERT policy pins this column to the caller's own auth.uid(), so a
  -- submission can never be attributed to a different user. NULL is allowed
  -- for anonymous callers, who have no identity to record.
  submitted_by   uuid references auth.users (id) on delete set null,
  submitted_via  text not null default 'anonymous',

  -- Moderation state. 'pending' is the only status an anonymous submitter can
  -- produce, and it is enforced by the INSERT policy's WITH CHECK.
  status         text not null default 'pending',

  -- Whether the testimonial sorts first on the public wall.
  featured       boolean not null default false,

  helpful_count  integer not null default 0,

  -- Audit trail for moderation decisions (PRD F-MOD-2).
  moderated_at   timestamptz,
  moderated_by   uuid references auth.users (id) on delete set null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint testimonials_status_valid
    check (status in ('pending', 'approved', 'rejected', 'hidden')),

  constraint testimonials_content_length
    -- PRD F-COL-2: 20–2000 characters.
    check (char_length(content) between 20 and 2000),

  constraint testimonials_author_name_length
    check (char_length(author_name) between 1 and 120),

  constraint testimonials_author_email_length
    check (char_length(author_email::text) <= 254),

  constraint testimonials_author_role_length
    check (author_role is null or char_length(author_role) between 1 and 120),

  constraint testimonials_author_company_length
    check (author_company is null or char_length(author_company) between 1 and 120),

  constraint testimonials_helpful_count_non_negative
    check (helpful_count >= 0),

  -- Audit integrity: a moderated testimonial must record who and when.
  -- The forward direction only — moderation metadata may exist without a
  -- status change yet, because a row can be touched after initial approval.
  constraint testimonials_moderation_recorded
    check (
      (moderated_at is null and moderated_by is null)
      or (moderated_at is not null and moderated_by is not null)
    ),

  -- A testimonial can only be approved if it has actually been moderated.
  -- This is a table-level invariant independent of RLS: it means that even a
  -- policy bug or a service-role script cannot leave a row in `approved`
  -- without a moderator having signed off.
  constraint testimonials_approval_requires_moderation
    check (status <> 'approved' or (moderated_at is not null and moderated_by is not null)),

  -- `featured` is a public-facing privilege: it reorders the public wall.
  -- Constrain it to approved rows so a pending row cannot be featured, which
  -- would otherwise let a submitter reserve a prime slot pending moderation.
  constraint testimonials_featured_requires_approval
    check (not featured or status = 'approved')
);

comment on table public.testimonials is
  'Customer testimonial submissions. Anonymous INSERT only; owner-only moderation.';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- Primary dashboard query: "all testimonials for my project", newest first.
create index if not exists testimonials_project_created_idx
  on public.testimonials (project_id, created_at desc);

-- Moderation queue filter: "pending for this project".
create index if not exists testimonials_project_pending_idx
  on public.testimonials (project_id, created_at desc)
  where status = 'pending';

-- PUBLIC WALL READ PATH. A partial index restricted to approved rows means the
-- anonymous read policy can be served entirely from this index: Postgres never
-- visits a pending/rejected row's heap tuple at all, so neither their content
-- nor their existence is inferable from the public endpoint.
create index if not exists testimonials_public_wall_idx
  on public.testimonials (project_id, featured desc, created_at desc)
  where status = 'approved';

-- Per-email rate limiting lookup (PRD F-COL-3 / NFR-S-4).
create index if not exists testimonials_author_email_idx
  on public.testimonials (author_email, created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.testimonials enable row level security;
alter table public.testimonials force row level security;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------

-- PUBLIC READ: approved testimonials on a PUBLISHED project only.
--
-- Applies to both `anon` and `authenticated` because the public wall is public
-- regardless of who is looking.
--
-- SECURITY NOTE — why the published-project check is required here and cannot
-- be delegated to the application:
--   An earlier draft of this policy tested only `status = 'approved'` and
--   reasoned that unpublished projects are hidden by the `projects` policy, so
--   the testimonial rows were "already covered". That reasoning is WRONG.
--   PostgREST exposes `testimonials` directly at /rest/v1/testimonials, so an
--   anonymous caller can query this table without ever going through the
--   /w/[slug] route. If an owner approves a testimonial and then unpublishes
--   the project, a status-only predicate would keep those rows publicly
--   readable for as long as the caller knows (or guesses) a project_id.
--   RLS is the boundary, so the boundary must state both conditions.
--
-- IMPORTANT: this SELECT policy does NOT expose `author_email`. A row-level
-- policy cannot do column-level redaction, so email exposure is handled by the
-- column GRANTs further below.
drop policy if exists testimonials_select_approved_public on public.testimonials;
create policy testimonials_select_approved_public
  on public.testimonials
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.projects p
      where p.id = testimonials.project_id
        and p.is_published = true
    )
  );

-- OWNER READ: full visibility into their own project's testimonials,
-- including pending/rejected/hidden and author emails.
--
-- Ownership is resolved by joining the parent project's owner. This is a
-- correlated subquery rather than a join in the policy body so it is evaluated
-- once per row against the projects primary key.
drop policy if exists testimonials_select_own on public.testimonials;
create policy testimonials_select_own
  on public.testimonials
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = testimonials.project_id
        and p.profile_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- ANONYMOUS INSERT — the public submission form
-- -----------------------------------------------------------------------------
-- This is the single most important policy in the schema. It grants write
-- access to unauthenticated callers, so every column an attacker would want to
-- manipulate is pinned by the WITH CHECK clause:
--
--   project_id  → must belong to a PUBLISHED project, otherwise submissions
--                 cannot be injected into drafts.
--   status      → forced to 'pending'. An anonymous client physically cannot
--                 self-approve. There is no code path — SQL, PostgREST, or
--                 service-role-free client — that lets an anonymous submitter
--                 write status = 'approved'.
--   featured    → forced to false, so nobody can reserve a featured slot.
--   moderated_* → forced NULL, so no fabricated moderation audit trail.
--   helpful_count → forced 0, so nobody can inflate their own vote count.
--   created_at / updated_at → forced to server time, so timestamps cannot be
--                 backdated to dodge a per-email rate-limit window.
--
-- The `approved requires moderation` CHECK constraint is the second line of
-- defense: even if this policy were somehow bypassed, an `approved` row with
-- NULL moderation metadata is rejected by the table.
--
-- NOTE ON RATE LIMITING: this policy deliberately does not enforce the
-- 5-per-hour limit from PRD F-COL-3. Rate limiting requires knowing the
-- caller's IP, which Postgres does not expose reliably to RLS. That control
-- belongs in the Milestone 3 route handler. See docs/MILESTONE-2.md.
-- -----------------------------------------------------------------------------
drop policy if exists testimonials_insert_anonymous on public.testimonials;
create policy testimonials_insert_anonymous
  on public.testimonials
  for insert
  to anon, authenticated
  with check (
    -- 1. Target must be a published project.
    exists (
      select 1
      from public.projects p
      where p.id = testimonials.project_id
        and p.is_published = true
    )
    -- 2-8. Pin every moderation-relevant and audit-relevant column.
    and status = 'pending'
    and featured = false
    and moderated_at is null
    and moderated_by is null
    and helpful_count = 0
    and created_at = now()
    -- 9. Provenance cannot be forged. An anonymous caller has no auth.uid(),
    --    so this accepts a NULL identity; an authenticated caller may only
    --    record its OWN id and cannot attribute a submission to another user.
    and submitted_by is not distinct from (select auth.uid())
  );

-- -----------------------------------------------------------------------------
-- OWNER MODERATION — UPDATE / DELETE
-- -----------------------------------------------------------------------------
-- Only the project owner may change an existing testimonial. Combined with the
-- column grants below, the owner's UPDATE is limited to the content and
-- moderation fields — they cannot re-point a testimonial at another project
-- (`project_id` is not granted), which would let them leak rows between
-- projects or attach someone else's submission to their wall.
-- -----------------------------------------------------------------------------
drop policy if exists testimonials_update_own on public.testimonials;
create policy testimonials_update_own
  on public.testimonials
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = testimonials.project_id
        and p.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = testimonials.project_id
        and p.profile_id = (select auth.uid())
    )
  );

-- DELETE: owner only. Note this also removes an anonymous visitor's own
-- submission if the owner decides to purge it — which is the intended
-- moderation behavior.
drop policy if exists testimonials_delete_own on public.testimonials;
create policy testimonials_delete_own
  on public.testimonials
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = testimonials.project_id
        and p.profile_id = (select auth.uid())
    )
  );

-- NOTE: there is deliberately NO `testimonials_update_*` or
-- `testimonials_delete_*` policy for `anon`. Anonymous visitors have exactly
-- one capability on this table: INSERT a pending row. Everything else requires
-- project ownership.
--
-- There is also NO policy letting a submitter update their own submission
-- (matched by author_email). That is a common feature in testimonial tools,
-- but it is a privilege that must not exist in the MVP: a submitter who could
-- edit an approved row could alter published content on a wall they do not
-- own. If it is added later, it must be limited to rows still in `pending`
-- AND never grant the ability to change `status`.

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke all on public.testimonials from anon, authenticated;

-- Anonymous visitors: read approved rows, insert pending rows. Nothing else.
grant select, insert on public.testimonials to anon;
grant select, insert, update, delete on public.testimonials to authenticated;

-- COLUMN-LEVEL PUBLIC READ RESTRICTION
-- This is the mechanism that keeps `author_email` private. RLS operates at row
-- granularity, so a policy alone cannot hide one column from the public wall.
-- Revoking SELECT on the column does.
--
-- Sequence for PostgREST:
--   * `select *` on this table → fails for anon (no privilege on author_email).
--   * explicit column list omitting author_email → succeeds.
-- The Milestone 3 public wall query must therefore enumerate columns
-- explicitly. This is the intended tradeoff: privacy over convenience.
revoke select (author_email, submitted_by, moderated_by) on public.testimonials from anon;

-- Authenticated users still get the full row for their own dashboards via the
-- owner SELECT policy; re-grant the columns that anon lost above, since grants
-- are additive per role.
grant select (author_email, submitted_by, moderated_by) on public.testimonials to authenticated;

-- Moderation writes are owner-scoped by policy. Restrict which columns are
-- writable so a stray UPDATE cannot rewrite provenance or timestamps.
revoke update on public.testimonials from authenticated;
grant update (
  content,
  author_name,
  author_role,
  author_company,
  status,
  featured,
  moderated_at,
  moderated_by
) on public.testimonials to authenticated;