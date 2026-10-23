# Supabase schema — Milestone 2

Hand-written, version-controlled SQL migrations for the Proofly MVP database.

## Layout

| File | Applies | Contents |
|------|---------|----------|
| `20261022000100_extensions_and_helpers.sql` | 1 | `extensions` schema, `pgcrypto`, `citext`, `set_updated_at()`, `current_user_id()` |
| `20261022000200_create_profiles.sql` | 2 | `public.profiles` + RLS + `handle_new_user()` signup trigger |
| `20261022000300_create_projects.sql` | 3 | `public.projects` (walls) + RLS + indexes |
| `20261022000400_create_testimonials.sql` | 4 | `public.testimonials` + RLS + indexes |
| `20261022000500_public_wall_reader.sql` | 5 | `get_public_project_by_slug()`, `get_public_testimonials()` |
| `20261022000600_verify_policies.sql` | 6 | **Read-only** audit queries. Changes nothing. |

> Migration `0006` contains only `SELECT` statements. It is a verification
> script, not schema. You may skip it during a real `supabase db push` if you
> prefer, and run it manually instead.

## Applying the migrations

Files are named for `supabase db push` ordering, but they are also plain SQL and
can be pasted into the Supabase SQL Editor in filename order. Both work.

### Option A — Supabase CLI (recommended, repeatable)

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B — SQL Editor (manual)

Project Dashboard → **SQL Editor** → New query → paste each file in numeric
order and run. Run `0001` through `0005`. `0006` is read-only; run it
afterwards to audit the result.

## Dashboard configuration required

The SQL alone is not enough. Two settings must match:

### 1. Auth → URL Configuration

Add your app origin and the callback path:

| Setting | Value |
|---|---|
| **Site URL** | `http://localhost:3000` (local) or your Vercel domain |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |
| | `https://<your-domain>/auth/callback` |

Supabase **only** redirects to URLs on this allow-list. Without the
`/auth/callback` entry, confirmation and password-reset emails will redirect to
the Site URL instead of completing the flow, and users will land on the home
page after clicking the link.

Prefer `NEXT_PUBLIC_APP_URL` in `.env.local` over request headers for local
development so this stays deterministic.

### 2. Auth → Email confirmations

Leave **"Confirm email"** enabled for production. It is required by PRD
F-AUTH-3. If you disable it during local testing, sign-up returns a session
immediately and the confirmation-link path is never exercised — test both.

## Environment variables

No change is needed to `.env.local.example`; the schema introduces no new
variables. It relies on the existing three:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser + server requests; RLS applies)
- `SUPABASE_SERVICE_ROLE_KEY` (server only; bypasses RLS)

## Schema summary

```
auth.users  (Supabase-managed)
    │ 1:1, ON DELETE CASCADE
    ▼
public.profiles ────────────────┐
    │ 1:N, ON DELETE CASCADE     │ owner-scoped policies
    ▼                            │
public.projects ─────────────────┤
    │ 1:N, ON DELETE CASCADE     │
    ▼                            │
public.testimonials ─────────────┘
```

`profiles` is the tenant root. Both `projects` and `testimonials` resolve
ownership by joining up to `profiles.id`.

### Table: `profiles`

One row per authenticated user, created by the `handle_new_user()` trigger at
signup.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `email` | `citext` | Denormalized display copy |
| `display_name` | `text` | CHECK 1–80 chars |
| `metadata` | `jsonb` | NOT NULL, CHECK is object |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` trigger-maintained |

### Table: `projects`

The wall. Named `projects` to match the codebase (`lib/demo-data.ts`,
`app/dashboard/projects/*`); called `walls` in the PRD and in the public URL
scheme `/w/{slug}`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` FK | → `profiles(id)` ON DELETE CASCADE |
| `slug` | `citext` | **UNIQUE**, CHECK lowercase-alnum-hyphen, 3–64 chars |
| `name` | `text` | NOT NULL, CHECK 1–120 |
| `description` | `text` | nullable, ≤ 2000 |
| `cta_label` / `cta_url` | `text` | CHECK url must be `http(s)`, pair must be both-or-neither |
| `is_published` | `boolean` | NOT NULL, default `false` |
| `created_at` / `updated_at` | `timestamptz` | |

### Table: `testimonials`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK | → `projects(id)` ON DELETE CASCADE |
| `author_name` | `text` | NOT NULL, CHECK 1–120 |
| `author_email` | `citext` | NOT NULL, **not selectable by `anon`** |
| `author_role` / `author_company` | `text` | nullable, ≤ 120 |
| `content` | `text` | NOT NULL, **CHECK 20–2000** |
| `submitted_by` | `uuid` FK | → `auth.users(id)` ON DELETE SET NULL |
| `submitted_via` | `text` | default `'anonymous'` |
| `status` | `text` | CHECK in `pending`/`approved`/`rejected`/`hidden`, default `pending` |
| `featured` | `boolean` | default `false` |
| `helpful_count` | `integer` | default `0`, CHECK ≥ 0 |
| `moderated_at` / `moderated_by` | | audit pair, CHECK both-or-neither |
| `created_at` / `updated_at` | `timestamptz` | |

## RLS policy matrix

RLS is `ENABLE`d **and** `FORCE`d on all three tables.

### `profiles`

| Policy | Command | Role | Predicate | Permits |
|---|---|---|---|---|
| `profiles_select_own` | SELECT | `authenticated` | `auth.uid() = id` | Read **your own** row only |
| `profiles_update_own` | UPDATE | `authenticated` | `auth.uid() = id` (using + check) | Edit **your own** row only |

There is **no INSERT policy**. Rows come from the `handle_new_user()` trigger
or trusted server code with the service-role key. This removes the primitive
where a client creates a profile for someone else's `id`.

### `projects`

| Policy | Command | Role | Predicate | Permits |
|---|---|---|---|---|
| `projects_select_published` | SELECT | `anon`, `authenticated` | `is_published` | Read **published** walls |
| `projects_select_own` | SELECT | `authenticated` | `auth.uid() = profile_id` | Read **your own** walls, incl. drafts |
| `projects_insert_own` | INSERT | `authenticated` | WITH CHECK `auth.uid() = profile_id` | Create a wall **you own** |
| `projects_update_own` | UPDATE | `authenticated` | using + check `auth.uid() = profile_id` | Edit **your own** walls |
| `projects_delete_own` | DELETE | `authenticated` | `auth.uid() = profile_id` | Delete **your own** walls |

### `testimonials`

| Policy | Command | Role | Predicate | Permits |
|---|---|---|---|---|
| `testimonials_select_approved_public` | SELECT | `anon`, `authenticated` | `status = 'approved'` **AND parent project `is_published`** | Read **approved** rows on **published** walls, public columns only |
| `testimonials_select_own` | SELECT | `authenticated` | parent project owned by caller | Read **all** rows on your walls, incl. `author_email` |
| `testimonials_insert_anonymous` | INSERT | `anon`, `authenticated` | see below | Submit a **pending** testimonial |
| `testimonials_update_own` | UPDATE | `authenticated` | parent project owned by caller | Moderate rows on **your** walls |
| `testimonials_delete_own` | DELETE | `authenticated` | parent project owned by caller | Delete rows on **your** walls |

There is **no** `anon` UPDATE or DELETE policy on `testimonials`. Verify with
audit query 3.

### Why the public SELECT policy checks `is_published`

An earlier draft tested only `status = 'approved'`, reasoning that unpublished
projects were already hidden by the `projects` policy. **That reasoning is
wrong and was corrected during review.** PostgREST exposes the table directly at
`/rest/v1/testimonials`, so an anonymous caller can query it without going
through `/w/[slug]`. Had the predicate stayed status-only, an owner who approved
testimonials and later unpublished the project would have left those rows
publicly readable. RLS is the boundary, so the boundary states both conditions.

## The anonymous INSERT policy, in detail

This is the only policy that grants write access to unauthenticated callers, so
every attacker-controllable column is pinned by the `WITH CHECK` clause:

```sql
with check (
  exists (select 1 from public.projects p
          where p.id = testimonials.project_id and p.is_published)
  and status        = 'pending'
  and featured      = false
  and moderated_at  is null
  and moderated_by  is null
  and helpful_count = 0
  and created_at    = now()
  and submitted_by  is not distinct from (select auth.uid())
)
```

- `project_id` must belong to a **published** project → no injecting submissions
  into drafts.
- `status = 'pending'` → **an anonymous submitter cannot self-approve.** There is
  no code path, via PostgREST or otherwise, that lets an anonymous caller write
  `status = 'approved'`.
- `featured = false` → nobody reserves a prime slot on the public wall.
- `moderated_* IS NULL` → no fabricated audit trail.
- `helpful_count = 0` → no self-inflated vote count.
- `created_at = now()` → server-generated only; cannot be backdated to evade the
  per-email rate limit.
- `submitted_by is not distinct from auth.uid()` → provenance cannot be forged.
  An anonymous caller (NULL identity) must submit NULL; an authenticated caller
  can only ever record its own id, so nobody can attribute a submission to
  another user. `is not distinct from` is the null-safe comparison.

### Why a submitter can never grant themselves approval

Three independent layers, any one of which is sufficient:

1. **RLS policy.** The INSERT policy pins `status = 'pending'`. The submitter is
   not the moderator, and no policy converts the inserting identity into an
   approving identity.
2. **Table CHECK constraint.** `testimonials_approval_requires_approval` rejects
   any row where `status = 'approved'` and the moderation audit fields are NULL.
   Even a bypassed policy cannot store an unapproved-but-visible row.
3. **Column GRANT.** `status`, `featured`, `moderated_at`, `moderated_by` are not
   in the `authenticated` UPDATE column grant. A user cannot approve their own
   submission by updating it — approval requires the **project owner**, checked
   via `testimonials_update_own`.

There is deliberately **no** policy letting a submitter edit their own
submission (matched by `author_email`). Such a feature is common, but it must
not exist in the MVP: a submitter who could edit an approved row could alter
published content on a wall they do not own.

## Public column exposure

RLS filters **rows**, not columns. `author_email` is therefore hidden from
anonymous readers by revoking the column privilege:

```sql
revoke select (author_email, submitted_by, moderated_by)
  on public.testimonials from anon;
grant select (author_email, submitted_by, moderated_by)
  on public.testimonials to authenticated;
```

**Consequence for the app:** `select *` on `testimonials` as `anon` fails.
Public queries must enumerate columns explicitly, or call
`get_public_testimonials()` (migration 0005), which pins the safe column list.

## Security-sensitive decisions and assumptions

Documented here because each one is a judgment call, not a forced choice.

1. **`projects` instead of `workspaces`.** The PRD specifies a `workspaces`
   entity, but makes it 1:1 with the user for the MVP (§4.3 F-WS-1, §12 M2). A
   separate table would add indirection with no added capability. **Assumption:**
   the PRD's single-owner model holds through the MVP. If team seats arrive,
   add `workspaces`, backfill `profiles.workspace_id`, and update the ownership
   predicates — they are centralized in `handle_new_user`'s successors and the
   policies above, so the change is localized.

2. **Public visibility is `is_published`, separate from testimonial approval.**
   A project can be published while all its testimonials are `pending`, in which
   case the public wall renders empty. The PRD does not specify this interaction;
   this split keeps "unpublished draft" and "nothing approved yet" as distinct,
   independently controllable states.

3. **`get_public_testimonials()` is `SECURITY INVOKER`, not DEFINER.** A
   `SECURITY DEFINER` reader would run with the definer's privileges and become
   an RLS bypass, handing every caller a service-role view. Invoker keeps RLS
   fully in force.

4. **`handle_new_user()` is `SECURITY DEFINER` but revoked from
   `anon`/`authenticated`.** It must be DEFINER to insert without a client
   INSERT policy, which makes it an escalation risk if left executable by
   clients. `revoke execute ... from public, anon, authenticated` plus a grant
   to `supabase_auth_admin` closes that. `search_path` is pinned.

5. **Rate limiting is NOT enforced in RLS.** PRD F-COL-3 / NFR-S-4 require
   5 submissions/hour per IP and per email. Postgres has no reliable access to
   the caller's IP, so this cannot be done in a policy. **This is deferred to
   the Milestone 3 route handler.** The `created_at` pinning in the INSERT
   policy and the `testimonials_author_email_idx` index exist to support that
   later per-email lookup. Until Milestone 3 ships, the public submission
   endpoint does not exist, so there is currently no unprotected write path.

6. **`citext` for `slug` and email.** Case-insensitive comparison means
   `Atlas` and `atlas` cannot both claim `/w/atlas`, and email lookups do not
   depend on the submitter typing the same casing.

7. **`cta_url` CHECK.** Restricted to `http(s)://`. Blocks `javascript:` and
   `data:` URLs, which would otherwise be stored XSS once rendered as a link on
   the public wall.

8. **Profiles are created by trigger, and `ensureProfileForCurrentUser()` in
   `app/(auth)/actions.ts` uses the service-role key.** This is the standard
   Supabase bootstrap pattern. The service-role client is `server-only`, has a
   runtime browser guard, and is only invoked after `auth.getUser()` has already
   proven the caller's identity. No RLS bypass is reachable from a browser.

9. **The dashboard layout redirect is not a security boundary.** It is
   user-experience defense in depth. The authoritative control is RLS: the
   anon-key client used by the app is RLS-bound, so a bypassed route guard
   would still return zero rows. Both layers must stay in place, but only RLS
   is load-bearing.

10. **All timestamps use bare `now()`, never `timezone('utc', now())`.** This
    was a bug found in review. `timezone('utc', now())` returns
    `timestamp without time zone`; assigning that to a `timestamptz` column
    makes Postgres reinterpret the value in the **session TimeZone**, shifting
    stored instants whenever the server does not run in UTC. `now()` is already
    a `timestamptz` absolute instant and is the correct value. This matters
    beyond tidiness: the per-email rate-limit window in Milestone 3 depends on
    `created_at` being accurate.

11. **`extensions` schema is created before `create extension ... with schema`.**
    Also found in review. Supabase projects ship with the schema, but the
    statements were originally ordered such that a vanilla Postgres instance
    would fail with "schema does not exist".

## What is NOT covered by these migrations

Deferred to later milestones by design:

- Rate limiting (Milestone 3) — see decision 5.
- The data-access/repository layer (Milestone 3, explicitly out of scope here).
- Replacing `lib/demo-data.ts` (Milestone 3).
- `wall_invites` and `audit_log` tables (PRD §7.1.4–7.1.5, P2).
- Generated TypeScript types from the schema (PRD §12 M2 follow-up).
- Storage policies for video uploads (P2).

## Verification after applying

Run migration `0006` and check:

| Query | Expected result |
|---|---|
| 1 — RLS enabled/forced | 3 rows, all `true` / `true` |
| 2 — full policy listing | matches the tables above |
| 3 — anon UPDATE/DELETE on testimonials | **0 rows** |
| 4 — helper function security | `prosecdef = false` for both |
| 5 — `handle_new_user` | `prosecdef = true` |
| 5b — `handle_new_user` EXECUTE | **0 rows** |

Then, per PRD §10.2, confirm manually that a second user cannot read the first
user's walls or testimonials through the Supabase client.