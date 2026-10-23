# Proofly — Product Requirements Document

**Status:** Draft v1
**Owner:** Product / Engineering
**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Vercel
**Last updated:** 2026-10-19

---

## 1. Product Overview and Problem Statement

### 1.1 Product overview

Proofly is a SaaS application that helps businesses and creators systematically collect, moderate, and display customer testimonials on the open web. Each user creates one or more **walls** — curated, public collections of testimonials — and shares a collection link with their customers. Submissions enter a moderation queue inside the user's dashboard; approved testimonials appear on a public, shareable, embeddable wall.

The product is inspired by Testimonial.to but is built from scratch to be lean, fast, multi-tenant by default, and friendly to incremental shipping.

### 1.2 Problem statement

Today, most teams collect testimonials in an ad-hoc manner — scattered across email threads, spreadsheets, Google Docs, screenshots of social DMs, and Notion pages. This causes three concrete problems:

1. **No provenance.** Testimonials arrive without a consistent schema (author, company, role, consent), so reuse is manual and error-prone.
2. **No moderation layer.** Raw submissions are mixed with approved quotes, leading to legal/compliance risk (GDPR, FTC endorsement guidelines) and embarrassing typos.
3. **No distribution surface.** Even when testimonials are collected, there is no lightweight, branded, embeddable way to put them on the customer's own site — leading to copy-paste screenshots and stale logos.

### 1.3 Vision statement

> Make social proof as easy to collect, curate, and publish as sending a tweet.

### 1.4 Solution summary

Proofly provides:

- A **collection form** (the customer's perspective) — a single link per wall that a customer opens and submits through.
- A **moderation queue** (the user's perspective) — approve, reject, feature, hide.
- A **public wall** (everyone's perspective) — fast, SEO-friendly, embeddable, and brandable.
- **Multi-tenant data isolation** enforced at the database layer, not in application code.

### 1.5 MVP scope boundary

The MVP delivers text testimonials end-to-end on the simplest reliable stack. Video recording, custom branding themes, embed widgets, billing, and team collaboration are explicitly deferred.

---

## 2. Target Users

### 2.1 Primary persona — "Solo Founder Sam"

- **Role:** Founder of a 1–10 person B2C SaaS or agency.
- **Age band:** 28–45.
- **Tools:** Next.js, Vercel, Notion, Stripe, Loom.
- **Pain:** Has paying customers but no systematic way to collect quotes; copy-pastes from Slack into marketing pages.
- **Goal:** Get 8–15 high-quality testimonials on the marketing site within 4 weeks of launch.
- **Success moment:** A new visitor lands on the marketing page, scrolls to a wall of 10 real quotes with names and photos, and clicks "Buy."

### 2.2 Secondary persona — "Marketing Manager Maya"

- **Role:** Marketing lead at a 20–100 person B2B company.
- **Pain:** Quarterly campaigns need fresh social proof; relies on a design agency to update the website, which is slow.
- **Goal:** Self-serve updates to the wall without engineering involvement.

### 2.3 Tertiary persona — "Endorser Emma" (the customer submitting the testimonial)

- **Role:** A satisfied customer asked to leave a testimonial.
- **Pain:** Long forms, account creation, "we will email you back" loops.
- **Goal:** Spend 60 seconds, type a paragraph, hit submit, walk away.
- **Constraint:** Will abandon if the page asks for a password or demands a social login.

### 2.4 Anti-personas (not targeting in MVP)

- Enterprise procurement teams (need SSO/SAML, custom DPA, audit logs — out of scope).
- Agencies white-labeling the product for many clients (multi-tenant within a single account — out of scope).
- Review platforms competing with G2/Capterra (feature breadth, not focus).

---

## 3. MVP Goals and Measurable Success Criteria

### 3.1 North-star metric

> **Approved testimonials published per active workspace per month.**

### 3.2 MVP goals

| # | Goal | Measurable success criterion | Target |
|---|------|------------------------------|--------|
| G1 | A new user can sign up and create their first wall in under 5 minutes. | Time from email-confirmed → first wall created, p50 over first 50 users. | ≤ 5 min |
| G2 | A submission to an approved-and-public testimonial appears on the public wall within 60 seconds of approval. | Measured end-to-end via Playwright on staging. | p95 ≤ 60 s |
| G3 | A customer (endorser) can submit a testimonial with no account creation. | Funnel: visit submit page → submitted, completion rate. | ≥ 70% |
| G4 | All authenticated data access enforces tenant isolation at the DB layer. | Static check: every protected query goes through an RLS policy; pen test attempts at cross-tenant reads fail. | 0 leaks |
| G5 | The marketing site and dashboard are usable on mobile (≥ 360 px width). | Manual QA checklist passes; Lighthouse mobile usability. | ≥ 95 |
| G6 | A user can embed a wall on an external page. | A static `<iframe>` snippet renders the wall with current data. | Works on CodePen |

### 3.3 Non-goals for MVP

- No video recording or upload in MVP (text first).
- No custom domains (Vercel subdomain only).
- No Stripe billing in MVP.
- No team seats / RBAC (single owner per workspace).
- No AI rewrites or sentiment scoring.
- No email-collection outreach automation (we host the page; the user sends the link).

---

## 4. Functional Requirements (Prioritized)

Priority legend: **P0** = must ship in MVP · **P1** = ship if time permits · **P2** = future quarter.

### 4.1 Marketing website (P0)

| ID | Requirement |
|----|-------------|
| F-MKT-1 | Public landing page at `/` describing Proofly's value prop. |
| F-MKT-2 | Pricing section with three static tiers (Free / Pro / Team) — pricing is descriptive only; no checkout in MVP. |
| F-MKT-3 | Sign-in CTA links to `/login`. |
| F-MKT-4 | Footer with company info, social links, terms, privacy. |
| F-MKT-5 | SEO meta tags and Open Graph card on every public page. |

### 4.2 Authentication (P0)

| ID | Requirement |
|----|-------------|
| F-AUTH-1 | Email + password sign-up via Supabase Auth. |
| F-AUTH-2 | Email + password sign-in. |
| F-AUTH-3 | Email confirmation link required before first dashboard access. |
| F-AUTH-4 | Password reset flow via email link. |
| F-AUTH-5 | Sign-out from any page; session cleared server-side via Supabase SSR. |
| F-AUTH-6 | All dashboard routes are server-side auth-gated; unauthenticated requests redirect to `/login?next=…`. |

### 4.3 Workspace management (P0)

| ID | Requirement |
|----|-------------|
| F-WS-1 | Each authenticated user has a single workspace implicitly created on first sign-in. |
| F-WS-2 | Workspace has `name` (defaults to user's display name) and `slug` (URL-safe). |
| F-WS-3 | User can edit workspace name on `/settings`. |
| F-WS-4 | User can delete their workspace; cascade deletes walls and testimonials. Requires typed confirmation. (P1) |

### 4.4 Public testimonial collection (P0)

| ID | Requirement |
|----|-------------|
| F-COL-1 | Each wall has a public collection URL: `/w/{wallSlug}/submit`. |
| F-COL-2 | The collection form captures: `authorName` (required), `authorEmail` (required, validated), `authorRole` (optional), `authorCompany` (optional), `content` (required, 20–2000 chars). |
| F-COL-3 | Submission is rate-limited per IP and per email (e.g., 5 per hour). |
| F-COL-4 | On submit, testimonial is stored with `status = 'pending'` and the wall owner receives a notification email (P1 — MVP just stores the row). |
| F-COL-5 | Honeypot field to deter bots; submissions without a valid CSRF token are rejected. |

### 4.5 Testimonial moderation (P0)

| ID | Requirement |
|----|-------------|
| F-MOD-1 | Dashboard list of all testimonials for the active wall, paginated, with status filter (pending / approved / rejected / all). |
| F-MOD-2 | Approve / reject / hide actions; status change is auditable with `moderatedAt` and `moderatedBy`. |
| F-MOD-3 | Feature action — featured testimonials sort first on the public wall. |
| F-MOD-4 | Edit action (P1) — owner can correct typos in approved content. Original content retained in audit log (P2). |

### 4.6 Public testimonial walls (P0)

| ID | Requirement |
|----|-------------|
| F-PUB-1 | Public wall URL: `/w/{wallSlug}`. |
| F-PUB-2 | Renders only `approved` testimonials, sorted featured-first then newest. |
| F-PUB-3 | Each card shows author name, optional role/company, content, optional avatar (text-only MVP — no upload), and a "Was this helpful" counter (P1). |
| F-PUB-4 | Optional CTA link on the wall (configurable URL + label, P1). |
| F-PUB-5 | Public wall must be server-rendered for SEO; cached for 60 s with on-demand revalidation when moderator changes status. |
| F-PUB-6 | Open Graph image auto-generated from wall title (dynamic OG, P1). |

### 4.7 Embeddable widget (P1)

| ID | Requirement |
|----|-------------|
| F-EMB-1 | Wall owner can copy an `<iframe>` snippet from the wall settings page. |
| F-EMB-2 | `X-Frame-Options` allows embedding from any origin (CSP `frame-ancestors *`). |
| F-EMB-3 | Snippet auto-resizes on load (`postMessage` handshake, P1). |

### 4.8 Video testimonials (P2)

| ID | Requirement |
|----|-------------|
| F-VID-1 | Collection form allows recording a ≤ 60 s clip via `MediaRecorder` API. |
| F-VID-2 | Upload to Supabase Storage; testimonial row stores the storage object URL. |
| F-VID-3 | Public wall renders `<video>` element with poster frame; autoplay muted on hover (P2). |
| F-VID-4 | Storage lifecycle rule deletes raw uploads after 90 days if no testimonial references them. |

### 4.9 Branding and themes (P2)

| ID | Requirement |
|----|-------------|
| F-BR-1 | Per-wall primary color, font family, and dark mode toggle. |
| F-BR-2 | Custom CSS injection within a sandboxed scope. |

### 4.10 Analytics (P1)

| ID | Requirement |
|----|-------------|
| F-AN-1 | Wall-level counts: submitted, approved, pending, rejected, last 7 days. |
| F-AN-2 | Public-wall view counter (privacy-respecting; first-party only). |

### 4.11 Billing (P2)

| ID | Requirement |
|----|-------------|
| F-BIL-1 | Stripe Checkout for Pro tier (e.g., $19/mo). |
| F-BIL-2 | Customer portal link. |
| F-BIL-3 | Free vs. Pro feature gates (e.g., 1 wall / 25 testimonials on Free). |

---

## 5. User Journeys

### 5.1 Journey A — Founder publishes first wall

1. Marketing site visitor clicks "Get started."
2. Lands on `/login`, signs up with email + password.
3. Opens confirmation email, clicks link, returns to the app.
4. Sees an empty dashboard with a primary CTA: "Create your first wall."
5. Clicks → `/walls/new` → enters title and slug → wall created.
6. Dashboard shows the wall with a **Copy collection link** button.
7. Pastes the link into a Slack DM to a happy customer.
8. Customer opens `/w/{slug}/submit`, fills the form, hits Submit. Sees a thank-you message.
9. Founder sees the testimonial in the moderation queue, clicks Approve.
10. Public wall at `/w/{slug}` now shows the testimonial.

### 5.2 Journey B — Moderator rejects and requests revision (P1)

1. Founder opens moderation queue.
2. Selects a pending submission that is too short.
3. Chooses "Reject with note" (P1) — system sends an email to the customer with a personal note and a one-click link back to the form (P1).

### 5.3 Journey C — Endorser submission with friction

1. Endorser opens `/w/{slug}/submit`.
2. Page fails to load due to network.
3. Page is cached on a CDN edge; retry succeeds within 1 s (P1 — MVP simply returns the live page on retry).

### 5.4 Journey D — Embed on a third-party site (P1)

1. Founder copies the iframe snippet from wall settings.
2. Pastes into a Webflow page.
3. Refreshes; the wall renders at the desired width.
4. Approves a new testimonial; it appears on the embedded copy within 60 s without a full rebuild.

### 5.5 Journey E — Malicious attempt at cross-tenant access

1. Attacker authenticates as user A, attempts to query user B's walls via Supabase client.
2. Request is rejected by RLS at the DB layer; the application never sees the data.

---

## 6. Page and Route Specifications

All routes are App Router routes. Server components by default; `'use client'` only where interactivity is required.

### 6.1 Marketing routes (public)

| Path | File | Auth | Purpose |
|------|------|------|---------|
| `/` | `app/page.tsx` | Public | Landing |
| `/pricing` | `app/pricing/page.tsx` | Public | Pricing tiers (static) |
| `/about` | `app/about/page.tsx` | Public | About / mission (P2) |
| `/login` | `app/(auth)/login/page.tsx` | Public | Sign-in + sign-up tabs |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Public | Reset link request |
| `/auth/callback` | `app/(auth)/callback/route.ts` | Public | Supabase email callback handler |
| `/legal/terms` | `app/legal/terms/page.tsx` | Public | Terms (P2) |
| `/legal/privacy` | `app/legal/privacy/page.tsx` | Public | Privacy (P2) |

### 6.2 Dashboard routes (auth-required)

| Path | File | Purpose |
|------|------|---------|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Overview + counts per wall |
| `/walls` | `app/(dashboard)/walls/page.tsx` | List walls |
| `/walls/new` | `app/(dashboard)/walls/new/page.tsx` | Create wall |
| `/walls/[wallId]` | `app/(dashboard)/walls/[wallId]/page.tsx` | Wall detail + testimonials moderation |
| `/walls/[wallId]/settings` | `app/(dashboard)/walls/[wallId]/settings/page.tsx` | Wall settings, embed snippet, delete |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Profile + workspace |

### 6.3 Public wall routes (public, no auth)

| Path | File | Purpose |
|------|------|---------|
| `/w/[wallSlug]` | `app/w/[wallSlug]/page.tsx` | Public, embeddable wall |
| `/w/[wallSlug]/submit` | `app/w/[wallSlug]/submit/page.tsx` | Public submission form |
| `/w/[wallSlug]/thank-you` | `app/w/[wallSlug]/thanks/page.tsx` | Post-submit thank-you (P1) |

### 6.4 API routes

| Path | Method | Purpose |
|------|--------|---------|
| `/api/walls/[wallId]/submit` | POST | Public submission endpoint (rate-limited) |
| `/api/walls/[wallId]/testimonials/[id]/moderate` | POST | Approve / reject / hide / feature (auth, RLS) |
| `/api/og/wall/[wallSlug]` | GET | Dynamic OG image (P1) |

### 6.5 Server actions

Used internally for form submissions from the dashboard (e.g., create wall, edit settings) — not exposed as routes.

---

## 7. Database Entities and Relationships

All tables live in the public schema in Supabase Postgres. Row Level Security is enabled on every table.

### 7.1 Entities

#### 7.1.1 `workspaces` (P0)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `owner_id` | `uuid` FK → `auth.users.id` | one workspace per owner (MVP) |
| `name` | `text` | editable |
| `slug` | `citext` UNIQUE | URL-safe, derived from name |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | trigger-maintained |

#### 7.1.2 `walls` (P0)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `workspace_id` | `uuid` FK → `workspaces.id` ON DELETE CASCADE | |
| `slug` | `citext` UNIQUE | public path key |
| `title` | `text` | |
| `description` | `text` | optional |
| `cta_label` | `text` | P1 |
| `cta_url` | `text` | P1 |
| `theme` | `jsonb` | P2 |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### 7.1.3 `testimonials` (P0)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `wall_id` | `uuid` FK → `walls.id` ON DELETE CASCADE | |
| `author_name` | `text` | required |
| `author_email` | `citext` | required, server-side |
| `author_role` | `text` | optional |
| `author_company` | `text` | optional |
| `content` | `text` | required, 20–2000 chars (CHECK) |
| `video_url` | `text` | P2 |
| `avatar_url` | `text` | P2 |
| `status` | `text` CHECK in (`pending`,`approved`,`rejected`,`hidden`) | default `pending` |
| `featured` | `boolean` | default false |
| `helpful_count` | `integer` | default 0 (P1) |
| `moderated_at` | `timestamptz` | |
| `moderated_by` | `uuid` FK → `auth.users.id` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### 7.1.4 `wall_invites` (P2)

Track outreach sent by the workspace owner.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `wall_id` | `uuid` FK → `walls.id` | |
| `sent_to_email` | `citext` | |
| `sent_at` | `timestamptz` | |
| `submitted_at` | `timestamptz` | nullable |

#### 7.1.5 `audit_log` (P2)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `actor_id` | `uuid` FK → `auth.users.id` | |
| `entity_type` | `text` | `wall` / `testimonial` |
| `entity_id` | `uuid` | |
| `action` | `text` | e.g., `approved`, `rejected` |
| `before` | `jsonb` | snapshot |
| `after` | `jsonb` | snapshot |
| `created_at` | `timestamptz` | |

### 7.2 Relationships

```
auth.users (Supabase managed)
    │
    │ 1
    ▼
workspaces ─── (CASCADE) ───► walls ─── (CASCADE) ───► testimonials
                                                  ╲
                                                   ╲── wall_invites (P2)

audit_log (P2) tracks events on walls and testimonials.
```

### 7.3 Indexes

- `walls(workspace_id)`
- `walls(slug)` UNIQUE
- `testimonials(wall_id, status)` — partial index `WHERE status = 'approved'` for public reads
- `testimonials(created_at DESC)` for ordering
- `workspaces(slug)` UNIQUE

### 7.4 Multi-tenancy model

- **Workspace** is the tenant boundary.
- Every protected query includes `workspace_id` and the RLS policy checks `current_setting('request.jwt.claim.sub')` against `workspaces.owner_id`.
- Public reads on `/w/[slug]` use a SECURITY DEFINER function `get_wall_by_slug(slug)` that returns rows only when requested through a route handler which explicitly marks them as public.

---

## 8. Authentication and Authorization

### 8.1 Authentication

- **Provider:** Supabase Auth (hosted).
- **Methods in MVP:** Email + password with mandatory email confirmation.
- **Session strategy:** Supabase SSR with `@supabase/ssr`; session token stored in HTTP-only cookies; refreshed in `middleware.ts` on every request.
- **Password policy:** Minimum 8 chars (Supabase default). No MFA in MVP.
- **OAuth providers:** P2 (Google, GitHub).

### 8.2 Authorization model

- **RBAC:** Single role per MVP — `owner`. The row owner of a workspace is the only one allowed to mutate it.
- **Enforcement layer:** Postgres RLS, not application code.
- **Service role key usage:** Only in trusted server contexts (webhook receivers — none in MVP — and admin scripts). Never in client code.

### 8.3 Authorization matrix

| Resource | Anonymous | Wall owner | Other authenticated user |
|----------|-----------|------------|--------------------------|
| Public wall `/w/[slug]` | read approved | read approved | read approved |
| Submit form `/w/[slug]/submit` | submit (rate-limited) | submit (rate-limited) | submit (rate-limited) |
| Create wall | ❌ (redirect to login) | ✅ | ❌ |
| Moderate testimonial | ❌ | ✅ | ❌ |
| Edit wall settings | ❌ | ✅ | ❌ |
| Workspace settings | ❌ | ✅ | ❌ |
| Delete workspace | ❌ | ✅ (with confirmation) | ❌ |

### 8.4 RLS policies (sketch)

- `walls`: SELECT for everyone if accessing through the public function; otherwise SELECT/INSERT/UPDATE/DELETE only when `workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())`.
- `testimonials`: SELECT for everyone only when row status = `approved`; INSERT open but rate-limited at the route layer; UPDATE/DELETE only when the parent wall is owned by `auth.uid()`.
- `workspaces`: SELECT/INSERT/UPDATE/DELETE only when `owner_id = auth.uid()`.

---

## 9. Security and Non-Functional Requirements

### 9.1 Security

| ID | Requirement |
|----|-------------|
| NFR-S-1 | All secrets read from environment variables at runtime; no keys committed. |
| NFR-S-2 | Service-role key is server-only; CI lint check prevents accidental client import. |
| NFR-S-3 | All forms with side effects use server actions validated by Zod; CSRF tokens on public submission endpoint. |
| NFR-S-4 | Submission endpoint applies per-IP and per-email rate limiting (5/hour each). |
| NFR-S-5 | All HTTP responses include: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP that disallows inline scripts except where required. |
| NFR-S-6 | User-submitted content is HTML-escaped at render time; never rendered as raw HTML. |
| NFR-S-7 | Passwords never logged. |
| NFR-S-8 | Logs redact `author_email` to the local part only in non-debug contexts. |

### 9.2 Privacy and compliance

- **Data residency:** Supabase US/EU region per user selection at sign-up (P2).
- **GDPR:** Right to erasure — delete workspace purges all rows via cascade. Right to export — workspace export as JSON (P1).
- **Cookies:** Consent banner deferred (P2) — initial release is "necessary cookies only" with no third-party trackers.

### 9.3 Performance

| ID | Requirement |
|----|-------------|
| NFR-P-1 | Marketing pages: TTFB ≤ 200 ms p95 on Vercel edge. |
| NFR-P-2 | Public wall: TTFB ≤ 200 ms p95 cached, ≤ 600 ms cold. |
| NFR-P-3 | Dashboard first contentful paint ≤ 1.5 s p75 on a 4G connection. |
| NFR-P-4 | Lighthouse performance score ≥ 90 on `/`, `/w/[slug]`, `/dashboard`. |
| NFR-P-5 | Public wall cached at the edge for 60 s with `revalidateTag('wall:{slug}')` on moderation events. |

### 9.4 Reliability and operability

| ID | Requirement |
|----|-------------|
| NFR-R-1 | Uptime target 99.5% (MVP), 99.9% (post-launch). |
| NFR-R-2 | Database automated daily backups retained 7 days (Supabase default). |
| NFR-R-3 | All changes ship via preview deployments on Vercel; production deploys gated on passing CI + manual approval. |
| NFR-R-4 | Structured logs to Vercel; errors mirrored to Sentry (P1). |

### 9.5 Accessibility

| ID | Requirement |
|----|-------------|
| NFR-A-1 | WCAG 2.1 AA on all pages. |
| NFR-A-2 | All interactive elements keyboard-navigable. |
| NFR-A-3 | Color contrast ratios ≥ 4.5:1 for body text. |
| NFR-A-4 | Visible focus indicators; never `outline: none` without a replacement. |

### 9.6 Internationalization (P2)

| ID | Requirement |
|----|-------------|
| NFR-I-1 | `next-intl` or equivalent. |
| NFR-I-2 | English (en-US) ships at MVP; locales added post-launch. |

### 9.7 Responsiveness

| ID | Requirement |
|----|-------------|
| NFR-RESP-1 | All pages usable at 360 px width. |
| NFR-RESP-2 | Mobile-first CSS; breakpoints at sm (640), md (768), lg (1024), xl (1280). |
| NFR-RESP-3 | Touch targets ≥ 44×44 px on mobile. |

### 9.8 Browser support

- Latest two versions of Chrome, Edge, Firefox, Safari.
- Safari iOS 16+.
- No IE / legacy Edge.

---

## 10. Acceptance Criteria

The MVP is considered releasable when **all** of the following are demonstrable on a production preview deployment:

### 10.1 Functional acceptance

- [ ] A new visitor can sign up with email + password, confirm via email link, and reach the dashboard.
- [ ] The same user can create a wall with a unique slug.
- [ ] The wall's collection link returns a public form with the four required fields and validates inputs.
- [ ] Submitting from the form persists a row with `status='pending'` and no auth required from the submitter.
- [ ] The dashboard shows the pending submission; approving it changes `status` to `approved`.
- [ ] The public wall `/w/[slug]` renders only approved testimonials, featuring any with `featured=true` first.
- [ ] Sign-out clears the session and revisiting `/dashboard` redirects to `/login`.

### 10.2 Multi-tenancy acceptance

- [ ] Manually created user B cannot read user A's walls or testimonials via the Supabase client or via crafted URLs.
- [ ] An attempted UPDATE to a foreign `walls` row returns 0 affected rows due to RLS.

### 10.3 Non-functional acceptance

- [ ] Lighthouse mobile score ≥ 90 on `/`, `/w/[slug]`, `/dashboard`.
- [ ] TTFB on public wall ≤ 200 ms p95 after warmup, measured from 3 Vercel regions.
- [ ] Headers listed in NFR-S-5 present on all routes.
- [ ] axe-core scans report 0 serious or critical violations on the four core pages.

### 10.4 Quality gates

- [ ] Unit tests cover the moderation state machine and the public/private access helpers.
- [ ] Playwright E2E covers journeys A and E from §5.
- [ ] CI green on every PR; main is always deployable.

---

## 11. Out of Scope (MVP)

The following are explicitly **not** in MVP and should not be designed for:

1. Team seats, roles, and permissions beyond single-owner.
2. Stripe billing and plan gating.
3. Video recording/upload (schema column reserved).
4. Custom domains and SSL provisioning for walls.
5. White-label multi-tenant accounts.
6. AI summarization, sentiment scoring, or content rewriting.
7. CRM integrations (HubSpot, Salesforce).
8. Webhooks and outbound APIs.
9. Audit log UI (the table can exist; UI deferred).
10. SAML / SSO.
11. Mobile apps (web responsive only).
12. Multi-language content (English only; tooling deferred).
13. Per-wall custom CSS or theme editor.
14. Public API for third parties.
15. Embeddable JavaScript widget (iframe only in MVP).

---

## 12. Development Milestones

Each milestone is a small, deployable slice. Validation criteria are concrete and observable.

### M0 — Foundation (current step)

- Next.js + TypeScript + Tailwind + shadcn/ui scaffolded.
- `.env.local.example` with documented placeholders.
- Supabase project linked; migrations folder initialized; CI green.

### M1 — Auth and shell

- Supabase SSR wired; `middleware.ts` refreshing sessions.
- `/login`, `/forgot-password`, `/auth/callback`, `/dashboard` skeleton.
- Empty-state dashboard with "Create your first wall" CTA.

### M2 — Workspaces and walls data model

- `workspaces`, `walls`, `testimonials` migrations with RLS policies.
- Supabase types generated and committed.
- `/walls` list, `/walls/new` create, `/walls/[id]` empty detail view.

### M3 — Public collection form

- `/w/[slug]/submit` with validation, honeypot, and rate limit.
- `/api/walls/[id]/submit` route handler.
- End-to-end: submit → row persisted → visible in dashboard moderation queue.

### M4 — Moderation

- Approve / reject / feature actions on the dashboard.
- Status badges, filtering, pagination.

### M5 — Public wall

- `/w/[slug]` rendering approved testimonials.
- Featured-first sort, responsive grid, OG meta tags.
- Edge caching with on-demand revalidation.

### M6 — Hardening and polish

- Full acceptance criteria checklist run.
- Sentry (P1) wired.
- Playwright E2E for the two critical journeys.
- Lighthouse passes; axe-core clean.
- Production deploy to a Vercel preview URL.

### M7 — Embed widget (P1)

- Wall settings page exposes iframe snippet.
- `X-Frame-Options` / CSP adjusted.
- Resize handshake via `postMessage`.

### M8 — Video testimonials (P2)

- `MediaRecorder` capture in submit form.
- Supabase Storage upload.
- Video element on the public wall.

### M9 — Billing (P2)

- Stripe Checkout + customer portal.
- Plan gating.

### Milestone ordering principle

Milestones are sequenced so each one ships a usable increment. M1–M6 are the MVP. M7+ are post-MVP roadmap items and may be re-prioritized based on feedback.

---

## Appendix A — Open Questions

Tracked here so they don't get lost in the PRD body.

1. Should MVP support multiple workspaces per user, or one? Current PRD assumes one.
2. Should the public wall include a "Submit your own" CTA on the same page as the wall, or only on `/submit`? PRD says only on `/submit`.
3. Do we want a per-wall allowlist of email domains for B2B use cases? Deferred to P2.
4. Will MFA be a hard requirement for any user segment? PRD assumes no for MVP.

## Appendix B — Glossary

- **Wall** — a curated collection of testimonials owned by a workspace, with a unique slug and a public URL.
- **Endorser** — the customer submitting a testimonial; never required to create an account.
- **Moderator** — the workspace owner who reviews submissions.
- **Featured** — a flag indicating a testimonial should sort first on the public wall.
- **Tenant** — synonymous with **workspace** in MVP.
