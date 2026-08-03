# Item #2 Cycle 1 - Ops & Data Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove production-readiness and operational risks (schema drift, missing indexes, N+1 queries, error leaks, Dockerfile/CI/Sentry/backup gaps) before the first paying customers.

**Architecture:** A series of mostly-independent, low-risk changes to migrations, schema, a couple of admin endpoints, Docker/CI/Sentry config, and docs. Ordered so the test suite is made reliable first, then data-layer fixes, then infra.

**Tech Stack:** Nuxt 4, Drizzle ORM + drizzle-kit, PostgreSQL (postgres-js), Vitest, Docker (node:20-alpine), Railway, Sentry, GitHub Actions.

## Global Constraints

- Never add `Co-Authored-By` trailers to commits (project rule).
- Never use em-dashes in prose/comments; use hyphens.
- Tests run with `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run` (no real DB contacted); CI uses the same mock URL.
- `db:generate` / `db:migrate` require a real local Postgres (`createdb cohort`, `DATABASE_URL=postgresql://localhost:5432/cohort`).
- Server endpoint files use explicit imports (no Nitro auto-import); import helpers from `#server/...`.
- Follow existing file patterns; do not restructure unrelated code.

---

## Task 1: Harden connection.ts + make the test suite reliable locally

Do this first so every later task has a green, deterministic suite.

**Files:**
- Modify: `server/database/connection.ts:5-8`
- Modify: `server/__tests__/setup.ts` (add env default)
- Test: `server/database/connection.test.ts` (create)

**Interfaces:**
- Produces: no new exports; `connection.ts` still exports `client` and `db`. Behaviour change: throws a clear error at import if `DATABASE_URL` is unset.

- [ ] **Step 1: Set a default DATABASE_URL in the test setup so the suite never depends on the import-time crash**

In `server/__tests__/setup.ts`, add at the very top (before the h3 import):

```ts
// Tests never contact a real database (connection is mocked per-suite), but
// server/database/connection.ts reads DATABASE_URL at import time. Provide a
// harmless default so the suite is green locally without extra env plumbing.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock'
}
```

- [ ] **Step 2: Write the failing test for the guard**

Create `server/database/connection.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('database connection', () => {
  it('throws a clear error when DATABASE_URL is missing', async () => {
    const original = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    // Bypass the module cache so the top-level guard re-runs.
    await expect(
      import(`./connection?nocache=${Date.now()}`)
    ).rejects.toThrow(/DATABASE_URL is not set/)
    process.env.DATABASE_URL = original
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/database/connection.test.ts`
Expected: FAIL (current code throws a `TypeError` about `.includes`, not the clear message).

- [ ] **Step 4: Add the guard in connection.ts**

Replace lines 5-8:

```ts
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Set it in your environment before starting the app.')
}

// Disable SSL for local development (localhost or sslmode=disable in URL)
const isLocal = connectionString.includes('localhost') || connectionString.includes('sslmode=disable')
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/database/connection.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the whole suite to confirm nothing regressed**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run`
Expected: all files pass.

- [ ] **Step 7: Commit**

```bash
git add server/database/connection.ts server/__tests__/setup.ts server/database/connection.test.ts
git commit -m "fix: clear error on missing DATABASE_URL and stabilise test env"
```

---

## Task 2: Fix the orphaned slack_workspaces migration

**Problem:** `schema.ts` defines `slackWorkspaces`, the journal runs to idx 18, but no journaled migration creates `slack_workspaces` (the one that would, `0012_slack_workspaces.sql`, is not in `_journal.json`). A fresh `db:migrate` omits the table.

**Files:**
- Create: a new migration `server/database/migrations/0019_*.sql` (generated, then hand-edited)
- Modify: `server/database/migrations/meta/_journal.json` (drizzle updates this on generate)
- Remove: `server/database/migrations/0012_slack_workspaces.sql` (the orphan)
- Reference: `server/database/schema.ts:31-43` (the table definition to match)

- [ ] **Step 1: Generate a migration from the current schema against a DB that lacks slack_workspaces**

On a scratch/empty local database (so drizzle detects the missing table), run:

```bash
DATABASE_URL=postgresql://localhost:5432/cohort npm run db:generate
```

Expected: a new `0019_*.sql` containing `CREATE TABLE "slack_workspaces" (...)` plus its FK constraints, and `_journal.json` gaining an idx-19 entry.

> If `db:generate` produces unrelated diffs, discard them and keep only the `slack_workspaces` CREATE TABLE + constraints in the new migration.

- [ ] **Step 2: Make the new migration idempotent for existing databases**

Edit the generated `0019_*.sql` so the table creation cannot fail on databases that already have it. Change `CREATE TABLE "slack_workspaces"` to `CREATE TABLE IF NOT EXISTS "slack_workspaces"`, and wrap each `ALTER TABLE ... ADD CONSTRAINT` in a guard:

```sql
CREATE TABLE IF NOT EXISTS "slack_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text NOT NULL,
  "slack_team_id" text NOT NULL,
  "slack_team_name" text,
  "access_token" text NOT NULL,
  "bot_user_id" text,
  "installed_by" text,
  "installed_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "slack_workspaces_slack_team_id_unique" UNIQUE("slack_team_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "slack_workspaces" ADD CONSTRAINT "slack_workspaces_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "slack_workspaces" ADD CONSTRAINT "slack_workspaces_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
```

(Match the exact column defs to `schema.ts:31-43`; adjust names if the generated SQL differs.)

- [ ] **Step 3: Delete the orphan file**

```bash
git rm server/database/migrations/0012_slack_workspaces.sql
```

- [ ] **Step 4: Verify against a fresh database**

```bash
createdb trellis_migtest
DATABASE_URL=postgresql://localhost:5432/trellis_migtest npm run db:migrate
DATABASE_URL=postgresql://localhost:5432/trellis_migtest npm run db:check
psql trellis_migtest -c "\dt slack_workspaces"
dropdb trellis_migtest
```

Expected: migrate succeeds, `db:check` reports no pending drift, and `slack_workspaces` exists.

- [ ] **Step 5: Verify the migration re-runs cleanly on a DB that already has the table**

```bash
DATABASE_URL=postgresql://localhost:5432/cohort npm run db:migrate
```

Expected: no error (the `IF NOT EXISTS` / guarded constraints are no-ops).

- [ ] **Step 6: Commit**

```bash
git add server/database/migrations
git commit -m "fix: journal slack_workspaces migration so fresh databases get the table"
```

---

## Task 3: Add targeted indexes

**Files:**
- Modify: `server/database/schema.ts` (import `index`; add index arrays to table definitions)
- Create: generated `server/database/migrations/0020_*.sql`
- Reference: table definitions in `schema.ts` for `users`, `feedback`, `goals`, `reviewSchedules`, `buddyCheckins`, `notifications`, `feedbackInsights`, `achievements`.

- [ ] **Step 1: Import the index helper**

In `schema.ts:1-11`, add `index` to the `drizzle-orm/pg-core` import list.

- [ ] **Step 2: Add index definitions to each table**

Each `pgTable` takes an optional third argument: a callback returning an array of indexes. For each table below, add (or extend) it. Example for `users`:

```ts
export const users = pgTable("users", {
  // ...existing columns...
}, (t) => [
  index("users_workspace_id_idx").on(t.workspaceId),
  index("users_email_idx").on(t.email),
  index("users_buddy_id_idx").on(t.buddyId),
]);
```

Apply the same pattern to add:
- `feedback`: `feedback_reviewee_id_idx`(reviewee_id), `feedback_reviewer_id_idx`(reviewer_id), `feedback_created_at_idx`(created_at), `feedback_published_idx`(published)
- `goals`: `goals_user_id_idx`(user_id), `goals_status_idx`(status)
- `reviewSchedules`: `review_schedules_user_id_idx`(user_id), `review_schedules_buddy_id_idx`(buddy_id), `review_schedules_scheduled_date_idx`(scheduled_date), `review_schedules_status_idx`(status)
- `buddyCheckins`: `buddy_checkins_user_id_idx`(user_id), `buddy_checkins_buddy_id_idx`(buddy_id), `buddy_checkins_review_schedule_id_idx`(review_schedule_id)
- `notifications`: `notifications_user_id_idx`(user_id)
- `feedbackInsights`: `feedback_insights_user_id_idx`(user_id)
- `achievements`: `achievements_user_id_idx`(user_id)

(Use the actual property names from each table's column definitions.)

- [ ] **Step 3: Generate the migration**

```bash
DATABASE_URL=postgresql://localhost:5432/cohort npm run db:generate
```

Expected: a `0020_*.sql` full of `CREATE INDEX` statements. Skim it to confirm only index additions.

- [ ] **Step 4: Apply and verify**

```bash
DATABASE_URL=postgresql://localhost:5432/cohort npm run db:migrate
DATABASE_URL=postgresql://localhost:5432/cohort npm run db:check
```

Expected: migrate applies; `db:check` reports no drift.

- [ ] **Step 5: Confirm the schema still typechecks**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add server/database/schema.ts server/database/migrations
git commit -m "perf: add indexes on foreign keys and hot query paths"
```

---

## Task 4: Fix N+1 in admin/insights/team-summary

**Files:**
- Modify: `server/api/admin/insights/team-summary.get.ts:62-73` (the per-user loop query)
- Test: `server/api/admin/insights/team-summary.get.test.ts` (update to new query shape)

**Interfaces:**
- Consumes: `db`, `feedbackInsights`, `users`, `getWorkspaceId` (already imported).
- Produces: same response shape (`GetTeamSentimentSummaryResponseSchema`); only the internal query strategy changes.

- [ ] **Step 1: Update the test to expect a single batched insights query**

In the test, the handler currently issues one `select` per user. Change the mocks so `allUsers` is fetched once and the recent insights for all users are fetched in ONE `select` (returning rows for multiple users, each with `userId`). Assert `mockDb.select` is called a bounded number of times (users query + one insights query), not once-per-user. Keep the existing sentiment/trend assertions.

- [ ] **Step 2: Run the test to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/insights/team-summary.get.test.ts`
Expected: FAIL (handler still loops).

- [ ] **Step 3: Replace the per-user loop with one query + in-memory grouping**

Replace the `for (const user of allUsers) { ... limit(2) }` block. Fetch all insights for the workspace's users in one query ordered by `userId, analysisDate DESC`, then in memory take the two most recent per user:

```ts
const userIds = allUsers.map((u) => u.id)
const allInsights = userIds.length
  ? await db
      .select({
        userId: feedbackInsights.userId,
        sentimentData: feedbackInsights.sentimentData,
        analysisDate: feedbackInsights.analysisDate,
        feedbackCount: feedbackInsights.feedbackCount,
      })
      .from(feedbackInsights)
      .where(inArray(feedbackInsights.userId, userIds))
      .orderBy(desc(feedbackInsights.analysisDate))
  : []

const insightsByUser = new Map<string, typeof allInsights>()
for (const row of allInsights) {
  const list = insightsByUser.get(row.userId) ?? []
  if (list.length < 2) list.push(row)
  insightsByUser.set(row.userId, list)
}
```

Then inside the existing `for (const user of allUsers)` loop, replace the DB call with `const recentAnalyses = insightsByUser.get(user.id) ?? []`. Add `inArray` to the `drizzle-orm` import (keep `desc`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/insights/team-summary.get.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx nuxt typecheck
git add server/api/admin/insights/team-summary.get.ts server/api/admin/insights/team-summary.get.test.ts
git commit -m "perf: batch team-summary insights into one query (fix N+1)"
```

---

## Task 5: Fix N+1 in admin/users/index.get

**Files:**
- Modify: `server/api/admin/users/index.get.ts:72-91` (per-user buddy lookup)
- Test: `server/api/admin/users/index.get.test.ts` (update to new query shape)

**Interfaces:**
- Produces: same response shape (`GetUsersResponseSchema`); buddy name now resolved via a self-join instead of per-user queries.

- [ ] **Step 1: Update the test to expect the buddy name via a join, not per-user selects**

Adjust the mocks so the users list (with buddy name joined) comes back from a single `select` with a `leftJoin` on a `users` alias, rather than one `select` per user. Keep the `counts` assertions.

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/users/index.get.test.ts`
Expected: FAIL.

- [ ] **Step 3: Replace the Promise.all buddy lookups with a self-join**

Import `alias` from `drizzle-orm/pg-core`. Create `const buddy = alias(users, "buddy")`, add `.leftJoin(buddy, eq(users.buddyId, buddy.id))` to the main users query, and select `buddyName: buddy.name`. Drop the `Promise.all(usersList.map(...))` block; map the rows to add `status: user.emailVerified ? "active" : "invited"` directly.

- [ ] **Step 4: Run to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/users/index.get.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx nuxt typecheck
git add server/api/admin/users/index.get.ts server/api/admin/users/index.get.test.ts
git commit -m "perf: resolve buddy names via join in admin users list (fix N+1)"
```

---

## Task 6: Harden error.message leaks

**Files (confirm exact set with a grep first):**
- Modify each handler whose 500 branch does `message: error.message ...`.
- Test: the co-located `*.test.ts` for any handler that has a "returns 500" assertion checking the message.

- [ ] **Step 1: Enumerate the offenders**

Run: `grep -rn "message: error.message" server/api server/utils`
Record the list. Expected candidates: `insights/analyze.post.ts`, `auth/set-password.post.ts`, `auth/add-password.post.ts`, `auth/accounts.get.ts`, `admin/insights/[userId].post.ts`, `admin/onboard/send-invitation.post.ts`, several `integrations/slack/*`, `health.ts`.

- [ ] **Step 2: For each, replace the dynamic 500 message with a static one (keep statusCode passthrough + console.error)**

Pattern (apply per file, keeping any existing `if (error.statusCode) throw error`):

```ts
} catch (error: any) {
  console.error("<existing context>:", error)
  if (error?.statusCode) throw error
  throw createError({ statusCode: 500, message: "<static message for this endpoint>" })
}
```

For `health.ts`, return a generic string in the 503 body instead of `error.message`.

- [ ] **Step 3: Update any test asserting the old dynamic message**

Where a test asserted `message` equalled a raw error string, change it to assert the static message (or just assert `statusCode: 500`).

- [ ] **Step 4: Run the full suite**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/api server/utils
git commit -m "fix: stop forwarding raw error messages to clients on 500"
```

---

## Task 7: Dockerfile multi-stage + npm ci + non-root

**Files:**
- Modify: `Dockerfile` (full rewrite)

- [ ] **Step 1: Rewrite the Dockerfile as multi-stage**

```dockerfile
# syntax=docker/dockerfile:1

# --- Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

- [ ] **Step 2: Build locally to verify**

Run: `docker build -t trellis-test .`
Expected: build succeeds; final stage contains only `.output`.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "build: multi-stage Dockerfile with npm ci and non-root user"
```

---

## Task 8: Railway healthcheck

**Files:**
- Modify: `railway.toml`

- [ ] **Step 1: Add the healthcheck path under [deploy]**

```toml
[deploy]
startCommand = "node .output/server/index.mjs"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
```

- [ ] **Step 2: Commit**

```bash
git add railway.toml
git commit -m "ops: add Railway healthcheck on /api/health"
```

---

## Task 9: Sentry sampling + PII

**Files:**
- Modify: `sentry.server.config.ts`, `sentry.client.config.ts`
- Modify: `nuxt.config.ts` (add `tracesSampleRate` to public runtime config, env-driven)

- [ ] **Step 1: Expose an env-driven sample rate**

In `nuxt.config.ts`, under `runtimeConfig.public.sentry`, add:

```ts
tracesSampleRate: Number(process.env.NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
```

- [ ] **Step 2: Use it and turn off PII in both Sentry configs**

In `sentry.server.config.ts` and `sentry.client.config.ts`, change:

```ts
tracesSampleRate: config.public.sentry.tracesSampleRate,
// ...
sendDefaultPii: false,
```

Leave `dsn`, `environment`, `release`, replay, and `enableLogs` as-is.

- [ ] **Step 3: Typecheck + commit**

```bash
DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx nuxt typecheck
git add sentry.server.config.ts sentry.client.config.ts nuxt.config.ts
git commit -m "ops: env-driven Sentry trace sampling (default 0.1) and disable PII"
```

---

## Task 10: Staging deploy step

**Files:**
- Modify: `.github/workflows/deploy-staging.yml`

- [ ] **Step 1: Add an explicit railway up step after migrations**

Mirror the production workflow (`release.yml`) deploy step. After the `db:migrate` step, add a step that runs `railway up` against the staging service, using `RAILWAY_TOKEN` and `RAILWAY_STAGING_SERVICE_NAME`. Match the exact action/version and service-var names used in `release.yml`.

- [ ] **Step 2: Sanity-check the YAML**

Run: `npx yaml-lint .github/workflows/deploy-staging.yml` (or visually confirm indentation).
Expected: valid.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-staging.yml
git commit -m "ci: deploy the app to Railway staging after migrations"
```

---

## Task 11: Backup documentation

**Files:**
- Modify: `CLAUDE.md` (Deployment section) and/or `docs/` deployment guide.

- [ ] **Step 1: Document the backup story**

Add a "Database Backups" subsection covering: where Postgres runs (Railway managed), how to confirm automated backup/retention is enabled in the Railway dashboard, retention window, and the manual restore path (Railway snapshot redeploy). Include a checklist line: "Verify Railway backup retention is enabled for staging and production."

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document database backup and restore story"
```

---

## Self-Review

- **Spec coverage:** C1.1 -> Task 2; C1.2 -> Task 3; C1.3 -> Tasks 4-5; C1.4 -> Task 6; C1.5 -> Task 7; C1.6 -> Task 8; C1.7 -> Task 9; C1.8 -> Task 10; C1.9 -> Task 11; C1.10 -> Task 1. All ten items covered.
- **Ordering:** Task 1 first stabilises the suite; migrations (2-3) before data-layer refactors (4-6); infra (7-11) last.
- **Verification:** every code task ends with a run command + expected result and a commit.
