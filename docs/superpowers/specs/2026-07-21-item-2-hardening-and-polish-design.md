# Item #2 - Hardening & Polish (Design Spec)

**Date:** 2026-07-21
**Status:** Approved design, ready for implementation planning
**Author:** Alex Bates (with Claude)

## Context

Following the pre-launch review of Trellis, item #1 (critical fixes) is complete:
the email/password sign-up account-takeover hole is closed and the app-layer
tenant-isolation gaps are fixed. This spec covers item #2: the second-tier
hardening and polish work identified in that review, agreed for delivery before
onboarding the first paying customers.

The work splits into two cycles by nature:

- **Cycle 1 - Ops & Data hardening:** ~10 mechanical items with little design
  surface. Becomes a single checklist-style implementation plan.
- **Cycle 2 - Onboarding + GDPR + Error UX:** ~6 items with real design
  decisions. Becomes a separate implementation plan.

**Recommended build order: Cycle 1 first**, then Cycle 2. Cycle 1 is low-risk,
stabilises production, and the migration/index/connection fixes are
foundational.

## Goals

- Remove production-readiness and operational risks before the first customers.
- Make first-customer onboarding smooth rather than a manual, Pocketworks-shaped
  console exercise.
- Meet baseline GDPR expectations for a UK product handling employee feedback
  data (data export, self-service deletion, privacy/terms pages).
- Replace the default framework error screen with a branded one.

## Non-goals / out of scope

- **The `workspaceId`-column + Postgres RLS migration.** This is the deeper
  tenant-isolation follow-up. It is deliberately deferred to a later, separate
  piece of work. Cycle 1's indexing is intentionally *targeted* so it does not
  overlap: the RLS migration will add its own columns and indexes.
- Self-serve signup / public checkout / Stripe billing (that is item #3).
- Any marketing-site redesign beyond adding legal pages + footer links.

---

## Cycle 1 - Ops & Data hardening

### C1.1 Orphaned migration

**Problem:** `0012_slack_workspaces.sql` is not in the Drizzle journal
(`_journal.json`), so `db:migrate` never applies it. A fresh database (new
environment / disaster recovery) is missing the `slack_workspaces` table while
existing DBs have it.

**Approach:** Generate a new, properly-journaled migration that creates the
table with `CREATE TABLE IF NOT EXISTS slack_workspaces (...)` (a no-op on
databases that already have it, correct on fresh ones), reconciled against the
current `schema.ts` definition. Quarantine/remove the stray
`0012_slack_workspaces.sql` so it cannot cause confusion.

**Verify:** Running `db:migrate` against an empty database produces the complete
schema including `slack_workspaces`.

### C1.2 Targeted indexes

**Problem:** Zero indexes are defined across 19 tables. Postgres does not
auto-index foreign keys, so tenant/user/date filters do sequential scans.

**Approach:** One migration adding indexes on the foreign keys and hot filter
columns:

- `users(workspace_id, email, buddy_id)`
- `feedback(reviewee_id, reviewer_id, created_at, published)`
- `goals(user_id, status)`
- `review_schedules(user_id, buddy_id, scheduled_date, status)`
- `buddy_checkins(user_id, buddy_id, review_schedule_id)`
- `notifications(user_id)`
- `feedback_insights(user_id)`
- `achievements(user_id)`

Defined via Drizzle index helpers in `schema.ts` and emitted as a migration.

### C1.3 N+1 query fixes

**Problem:** Two admin endpoints issue per-row queries in a loop.

**Approach:**
- `admin/insights/team-summary.get.ts`: replace the per-user
  `feedbackInsights` query inside `for (const user of allUsers)` with a single
  query fetching the recent analyses for all users at once, then group in
  memory.
- `admin/users/index.get.ts`: replace the per-user buddy-name lookup
  (`Promise.all(map(... db.select ...))`) with a self-join on `users`.

Existing tests for these endpoints are updated to match.

### C1.4 error.message leak hardening

**Problem:** ~11 handlers put raw `error.message` on the generic 500 branch,
which can forward Postgres/driver internals to clients.

**Approach:** In each, replace the dynamic message with a static one and keep the
`console.error(...)` server-side log. Apply the same pattern already used in the
handlers fixed during item #1. Candidate handlers (to be re-confirmed during
implementation): `insights/analyze.post.ts`, `auth/set-password.post.ts`,
`auth/add-password.post.ts`, `auth/accounts.get.ts`,
`admin/insights/[userId].post.ts`, `admin/onboard/send-invitation.post.ts`,
several `integrations/slack/*`, and `health.ts`.

### C1.5 Dockerfile

**Problem:** `RUN npm install` (ignores the lockfile); single-stage image ships
devDependencies + source; runs as root.

**Approach:** Use `npm ci`; convert to a multi-stage build (builder stage runs
the build, runner stage copies only `.output` and production runtime); set
`NODE_ENV=production`; add a non-root `USER`.

### C1.6 Railway healthcheck

**Approach:** Add `[deploy] healthcheckPath = "/api/health"` to `railway.toml`
so Railway waits for the app + DB to be ready (the `/api/health` endpoint
already exists and checks the DB).

### C1.7 Sentry configuration

**Decision (locked):** Set `tracesSampleRate` from an env var, defaulting to
**0.1**; set **`sendDefaultPii: false`**. Reduces tracing cost at scale and
stops sending user PII to Sentry, consistent with the privacy policy (C2.15).

**Approach:** Update `sentry.client.config.ts` and `sentry.server.config.ts`.
Keep release tagging and DSN gating as-is.

### C1.8 Staging deploy step

**Problem:** `deploy-staging.yml` runs migrations but never deploys the app,
leaving app deploy to Railway's own auto-deploy with no ordering guarantee.

**Approach:** Add an explicit `railway up` step after migrations, mirroring the
production workflow so migration/deploy ordering is deterministic.

### C1.9 Backup documentation

**Approach:** Document the Railway Postgres backup + retention story in
`CLAUDE.md` / docs. Includes a manual verification step (dashboard-side) that
retention is enabled. Documentation + verification only; no code.

### C1.10 connection.ts guard + flaky test

**Problem:** `connection.ts` reads `process.env.DATABASE_URL!` and calls
`.includes(...)` at import time, crashing opaquely if the var is unset. This is
also why `seed-demo.test.ts` fails locally (it passes in CI only because CI
injects a mock `DATABASE_URL`).

**Approach:** Guard with a clear "DATABASE_URL is not set" error. Set
`DATABASE_URL` in the vitest setup/config so the suite is green locally without
relying on the import-time crash behaviour.

---

## Cycle 2 - Onboarding + GDPR + Error UX

### C2.11 Auto-send invites + onboard UI

**Problem:** CSV import and manual add both create users with no email; invites
must be sent manually per user from a different page. The onboard page has no
invite UI. Onboard copy hardcodes "@pocketworks.co.uk".

**Approach:**
- **Manual single add:** send the invitation email immediately on user creation.
- **CSV import:** create the users, then land on a **review screen** showing the
  created users and any per-row errors, with a "Send invitations" action
  (all or selected) that calls the existing bulk-invitation endpoint.
- Remove the "@pocketworks.co.uk" wording from the onboard UI.

### C2.12 CSV parser

**Problem:** The parser uses naive `split("\n")` / `split(",")`, breaking on
quoted fields and commas-in-values.

**Approach:** Adopt **papaparse** (header mode, skip-empty-lines; handles
quoting, escaped quotes, CRLF, BOM). Keep the existing validation and dedup
logic operating on the parsed rows.

### C2.13 Account deletion (anonymize-retain-feedback)

**Decision (locked):** Anonymize and retain authored feedback (do not hard
delete). Triggers: **both** user self-service and admin-initiated.

**Shared routine:**
- Set `name` to "Deleted user"; null `email` (using a tombstone value if needed
  to avoid unique-constraint collisions); clear `avatarUrl`/`image`, `bio`,
  `pronouns`, `preferredName`.
- Delete the user's `goals`, `buddy_checkins`, `achievements`, `notifications`.
- **Keep feedback the user authored** (`reviewer_id`), with the author now
  anonymized via the scrubbed user record.
- Null any `buddy_id` on other users that points at the deleted user.
- Remove the user's better-auth `accounts` and `sessions` (logs them out).

**Guard (locked judgment call):** Block self-deletion by the workspace's **sole
admin** with a "transfer admin first" message, to avoid orphaning the workspace.

**Entry points:**
- User: Settings -> Privacy -> "Delete account" (confirmation modal).
- Admin: Users -> remove member (reuses/upgrades the existing admin delete to
  run the anonymize routine).

### C2.14 Data export

**Decision (locked):** In-app, synchronous, self-service JSON download.

**Approach:** Settings -> Privacy -> "Download my data" calls a GET endpoint that
returns `trellis-export-<user>.json` containing: profile, feedback given,
feedback received, goals, reviews, check-ins, achievements. Scoped to the
requesting user only.

### C2.15 Privacy + terms pages

**Decision (locked):** Claude drafts GDPR-friendly boilerplate; Alex/legal
reviews before relying on it.

**Approach:** Build `/privacy` and `/terms` pages with drafted copy covering:
data collected and why; sub-processors (Railway, Resend, Anthropic, Plausible);
retention; data-subject rights (access/export/erasure, cross-referencing C2.13
and C2.14); contact. Wire both into the marketing footer. Mark the copy clearly
as draft pending legal review.

### C2.16 Custom error page

**Decision (locked):** One branded, app-styled `error.vue`.

**Approach:** A single Nuxt `error.vue` catching 404/403/500/etc., with
status-specific copy, a "back to dashboard" / "log in" CTA, and Sentry capture.
Replaces the default Nuxt UI error screen across the app.

---

## Testing strategy

- **C1.1 / C1.2:** verify a fresh `db:migrate` produces the full schema
  including `slack_workspaces`; index migration applies cleanly.
- **C1.3:** update existing unit tests for `team-summary` and
  `admin/users/index.get` to the rewritten (join/grouped) queries.
- **C1.4:** assert the 500 branch returns the static message, not `error.message`.
- **C1.10:** suite runs green locally (vitest sets `DATABASE_URL`); a clear error
  is thrown when the var is genuinely absent.
- **C2.11:** invite-send flow tests (immediate on manual add; review-then-send on
  import).
- **C2.12:** CSV parser tests with quoted fields, commas-in-values, CRLF, BOM.
- **C2.13:** deletion routine unit tests: anonymisation correctness, authored
  feedback retained, dependent rows removed, buddy pointers nulled, sole-admin
  guard blocks self-deletion.
- **C2.14:** export endpoint returns the expected shape scoped to the caller.
- **C2.16:** basic `error.vue` render test across a couple of status codes.

## Locked decisions

1. Structure: hybrid - Cycle 1 (ops checklist plan) + Cycle 2 (design plan).
2. Account deletion: anonymize-and-retain-feedback; self-service **and** admin;
   sole-admin cannot self-delete without transfer.
3. Data export: in-app synchronous JSON download, self-service.
4. CSV parser: adopt papaparse.
5. Privacy/terms: Claude drafts boilerplate for legal review.
6. Invite timing: manual add sends immediately; CSV import uses review-then-send.
7. Error page: single branded app-styled `error.vue`.
8. Sentry: `tracesSampleRate` env-driven default 0.1; `sendDefaultPii: false`.
9. Indexes: targeted now; the full/`workspaceId` set lands with the deferred RLS
   work.
10. Build order: Cycle 1 first, then Cycle 2.
