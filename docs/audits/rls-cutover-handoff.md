# RLS Cutover - Handoff for a New Session

**Purpose:** everything needed to finish the row-level-security (RLS) tenant-isolation backstop for Trellis in a fresh session. This is the final step of finding **TRE-44** and the last substantive piece of **Phase 1** (defensible multi-tenant launch). Read this top to bottom before writing code.

Related context the new agent should also read:
- `docs/audits/db-isolation-backstop-plan.md` - the original design.
- `docs/audits/remediation-plan.md` - the whole Phase 1/2/3 roadmap.
- `docs/audits/trellis-security.pdf` - the audit (finding F1 and the cross-tenant cluster explain *why* isolation matters).
- Memory files (auto-loaded): `project_rls_connect_role` (the superuser finding + role decision) and `project_audit_remediation`.

---

## Status (updated 2026-08-02): cutover code has landed

The staging soak of the request middleware (PR #101) passed, and the cutover was
implemented and reviewed as two parts, now consolidated into a single PR (#103)
into `staging`. Sections 1-8 remain accurate as the design; this banner records
what is now done versus what still needs a human.

- **Prep (migration 0024):** gives the ten content tables a `workspace_id` column
  DEFAULT from `app.current_workspace_id`, and every write path with no request
  scope was made RLS-ready (notifications, the two reminder tasks, the user-linking
  auth hook, the Slack webhook). Extends the restricted-role integration test to
  prove the DEFAULT stamps + confines new rows. Safe with RLS still OFF.
- **Enable (migration 0025):** creates the `trellis_app` role (idempotent), grants
  it, and enables RLS + the `tenant_isolation` policy on the ten tables. **Inert
  until the connection swap** because the table owner bypasses RLS - so deploying
  it changes nothing until step 4 below.

**Two deviations from the plan in sections 4/6, both deliberate:**
1. **Role is created by migration 0025**, not by hand. It reads the password from
   a `trellis.app_role_password` setting; with none provided it creates the role
   *without* a password (so automated deploys never block) and it simply cannot
   log in until a password is set. See the revised checklist in section 6.
2. **`NOT NULL` on `workspace_id` is deferred** to a follow-up (not in 0025). The
   RLS policies already make any NULL-workspace row invisible to every tenant
   (fail closed), so isolation does not depend on it. Adding `NOT NULL` now would
   break the integration tier, which builds its DB from `schema.ts` via
   `drizzle-kit push` and inserts through handlers without a request workspace
   GUC (so the DEFAULT resolves to NULL). The follow-up must first teach that tier
   to set a workspace context. Tracked as a new hardening task under TRE-44.

**What still needs a human (the actual cutover):** set the `trellis_app` password
and point the app's `DATABASE_URL` at it - staging first, soak, then production.
Details in sections 5, 6, and 8.

---

## 1. Where we are

The backstop was built in four steps; the first three are **merged to `staging`**:

1. **Column + backfill (merged, PR #98):** every tenant-content table got a nullable `workspace_id` (text FK to `workspaces`, `ON DELETE CASCADE`), backfilled from each row's owner. The ten tables: `feedback`, `goals`, `goal_milestones`, `goal_notes`, `review_schedules`, `buddy_checkins`, `feedback_insights`, `achievements`, `notifications`, `onboarding_imports`. (Backfill derivations: direct `user_id` for most; `reviewee_id` for feedback; parent goal for milestones/notes.)
2. **Plumbing (merged, PR #100):** `server/database/connection.ts` gained an `AsyncLocalStorage`-based `db` proxy plus `withWorkspace(ctx, fn)` and `withRlsBypass(fn)` helpers. The proxy routes `db` queries onto a request/task-scoped connection when one is active.
3. **Request middleware (merged, PR #101):** `server/middleware/z-workspace-scope.ts` reserves a dedicated connection per authenticated request, sets the workspace as session settings on it, routes `db` through it, and releases (`DISCARD ALL`) on the response `close` event. Plus `server/api/_debug/scope.get.ts` (super-admin only) to confirm propagation during the soak.

**Still to do (this session): the cutover.** Create the restricted DB role, enable RLS policies, make new rows carry `workspace_id`, set `NOT NULL`, wrap background/super-admin work in the bypass, and swap the runtime connection to the restricted role.

**RLS is currently OFF everywhere.** Nothing enforces isolation at the DB yet; the app still connects as a superuser (see below).

---

## 2. The gate: staging soak MUST pass before cutover

PR #101 is soaking on staging. **Do not start the cutover until Alex confirms both:**

1. **No connection leaks / no latency regression** after a couple of days of normal use. Symptom of a leak: the app gets progressively slower and eventually errors with "too many connections"/timeouts. (The middleware reserves a connection per authenticated request and releases it on response `close`; a leak means release isn't firing.)
2. **`GET /api/_debug/scope` returns `scopedInHandler: true`** when hit as a super-admin on staging. This positively confirms the `AsyncLocalStorage` context reaches handlers - the property the cutover depends on. With RLS off this is otherwise invisible (a propagation failure silently falls back to the pool and looks fine).

If either fails, fix the middleware/lifecycle before proceeding - the cutover assumes both hold.

---

## 3. Decisions already made (do not re-litigate)

- **Enforcement = Postgres RLS via a dedicated non-owner role.** The app currently connects as `postgres`, which is **superuser AND `BYPASSRLS` on both staging and production** (verified 2026-07-31). Superusers/BYPASSRLS roles *always* skip RLS, and `FORCE ROW LEVEL SECURITY` does not change that. So RLS is inert until the app connects as a dedicated `NOSUPERUSER NOBYPASSRLS` role that does not own the tables. This is non-negotiable given the finding; it was Alex's explicit choice over the weaker app-predicate alternative.
- **Backfill runs in the migration chain** (already merged), not a manual script.
- **Migrations keep using the owner connection.** CI's deploy job runs `db:migrate` with the `STAGING_DATABASE_URL` / `PRODUCTION_DATABASE_URL` GitHub secrets (owner). Only the **app runtime** (`server/database/connection.ts`, which reads Railway's `DATABASE_URL` env) swaps to the restricted role. These are already separate, so the swap is isolated to the Railway app service's env var.

---

## 4. Cutover implementation plan

Recommend splitting into a **prep PR** (new-row workspace_id + task bypass + tests, all safe with RLS still off) and the **enable PR** (role, policies, NOT NULL, connection swap). The prep PR can merge and soak; the enable PR is the actual cutover.

### 4a. Make new rows carry `workspace_id` (PREP - do this first, before NOT NULL/RLS)

Today the ten content tables' handlers do **not** set `workspace_id` on insert (the column was added nullable). Under RLS, an INSERT must satisfy `WITH CHECK (workspace_id = current_setting('app.current_workspace_id'))`, and after `NOT NULL` it must be non-null. Two viable approaches - **recommend the column DEFAULT**:

- **Recommended: a column DEFAULT from the session GUC.**
  `ALTER TABLE feedback ALTER COLUMN workspace_id SET DEFAULT current_setting('app.current_workspace_id', true);` (repeat per table). Then any insert that omits `workspace_id` picks up the request's workspace automatically - no handler changes for the common path, and it matches `WITH CHECK`. Works for feedback too because F3 now guarantees reviewer and reviewee share a workspace.
  - Caveat: inserts made under `withRlsBypass` (tasks, super-admin) have `app.current_workspace_id` unset, so the DEFAULT would be empty. Those insert paths MUST set `workspace_id` explicitly (derive from the target user's workspace). See 4b.
- Alternative: set `workspace_id` explicitly in every content-insert handler. More invasive, easy to miss a site. Prefer the DEFAULT.

**Verify** every insert path: grep the ten tables' `.insert(` sites. The task path (`server/tasks/review-reminders.ts` inserts `notifications` via `createNotification`) and any super-admin insert must set `workspace_id` explicitly.

### 4b. Wrap background + super-admin DB work in the bypass (PREP)

After the role swap the app connects as the restricted role, so **anything that legitimately spans workspaces must run inside `withRlsBypass(fn)`** or it will see nothing / fail `WITH CHECK`:
- The `review-reminders` task (`server/tasks/review-reminders.ts`) - it reads all workspaces' schedules and writes notifications. Wrap its `run()` body in `withRlsBypass`, and make its notification inserts set `workspace_id` from each target user's workspace (since the bypass has no `app.current_workspace_id`).
- Any other `defineTask`, seed/CLI scripts that run in the app process, and the user-linking auth hook (`server/utils/auth.ts`) if it writes content rows.
- Super-admin routes (`/api/super-admin/*`): the middleware already sets `is_super_admin='on'` for super-admin users, so their requests bypass RLS via the policy. Confirm this is the desired behaviour (platform operator sees across workspaces) and that super-admin inserts set `workspace_id` explicitly where needed.

### 4c. Extend the test suite to run under the restricted role (PREP)

Critical for confidence: today the integration suite runs as superuser (RLS bypassed), so it would NOT catch a handler that breaks under RLS. Add a mode/suite that runs handler integration tests **as the `trellis_app` role with RLS enabled**, so any handler missing workspace context, or any insert that violates `WITH CHECK`, fails in CI. The existing `server/database/rls.integration.test.ts` already shows how to create the role + policy and connect as it; generalise that. This is the single most valuable safety net for the cutover - do not skip it.

### 4d. The RLS enable migration (ENABLE PR)

A migration (owner-run, so it can create roles/policies) that:

1. **Create the app role** (idempotent): `NOSUPERUSER NOBYPASSRLS`, `LOGIN`, with a password from a secret. It must NOT own the tables.
   ```sql
   CREATE ROLE trellis_app LOGIN PASSWORD :'pw' NOSUPERUSER NOBYPASSRLS;
   ```
   (On Railway managed PG the owner is `postgres`; this role is separate. Password: generate and store as a Railway secret - see the checklist.)
2. **Grants** - the app touches far more than the ten content tables. Grant on ALL tables/sequences the runtime uses (users, session, account, verification, workspaces, review_templates, slack_workspaces, feedback_prompts, demo_requests, and the ten content tables):
   ```sql
   GRANT USAGE ON SCHEMA public TO trellis_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trellis_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trellis_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trellis_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO trellis_app;
   ```
3. **Policies on the ten content tables** (fail-closed, with the super-admin bypass):
   ```sql
   ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON feedback
     USING (workspace_id = current_setting('app.current_workspace_id', true)
            OR current_setting('app.is_super_admin', true) = 'on')
     WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
            OR current_setting('app.is_super_admin', true) = 'on');
   ```
   FORCE is not needed (the app role is not the owner; the owner `postgres` intentionally bypasses so migrations work). Do NOT put RLS on users/session/account/verification/workspaces/etc. - only the ten content tables.
4. **NOT NULL** on `workspace_id` for the ten tables - but only after re-backfilling any rows created nullable since PR #98 (`UPDATE ... WHERE workspace_id IS NULL` from the owner, then `SET NOT NULL`). Guard: assert zero nulls first; fail loudly otherwise.

Sequencing inside the migration matters: grants + DEFAULTs + backfill-any-nulls + NOT NULL happen while still connected as owner; policies can be created anytime. The role swap (below) is the actual cutover moment.

### 4e. Swap the runtime connection (ENABLE - the cutover moment)

- Set the **Railway app service** `DATABASE_URL` to connect as `trellis_app` (staging first, then production). Leave the CI migration secrets (`STAGING_DATABASE_URL`/`PRODUCTION_DATABASE_URL`) as the owner.
- After the swap, the app runs under RLS. The middleware sets the workspace context per request; the DEFAULT + policies enforce isolation; tasks/super-admin use the bypass.

---

## 5. Verification & rollback

- **Before cutover:** the extended integration suite (4c) is green running as the app role with RLS on. Manually run the audit's cross-tenant tests on staging (two workspaces; confirm a user in A cannot read/write B's feedback/goals/reviews - the same checks in `server/api/**/*.integration.test.ts`).
- **Staging soak (again):** after enabling RLS on staging, use the app as a normal user AND a super-admin; confirm nothing is over-restricted (empty dashboards = a missing bypass or missing context) and nothing leaks (cross-workspace visibility). Only then swap production.
- **Rollback (fully reversible, no data loss):** revert the app `DATABASE_URL` to the owner connection - RLS instantly becomes inert again (owner bypasses). The policies/column/NOT NULL can stay harmlessly. This is the fast escape hatch; keep it in mind at cutover.

---

## 6. Railway checklist for Alex (the human steps)

Migration 0025 already creates the `trellis_app` role and enables RLS when it
deploys (via the normal migrate step). Because the migration got no password, the
role exists but cannot log in yet. To finish the cutover, per environment
(**staging first, soak, then production**):

1. Generate a strong password for `trellis_app`.
2. Set the password on the role, interactively via `railway connect Postgres` for
   the env, then in the `psql` prompt:
   ```
   \password trellis_app
   ```
   Use `\password` (not `ALTER ROLE ... PASSWORD '<pw>'`): it prompts for the
   value and sends it pre-hashed, so the plaintext never lands in psql history or
   the Postgres server log. **Do not** script this or bake the password into a URL
   - both leak it into shell history / CI logs. (The migration can also take a
   password via a `trellis.app_role_password` setting, but that path is not
   recommended here: it depends on the migrate driver forwarding startup options
   and breaks on passwords containing `=`, `&`, or spaces - prefer `\password`.)
   Then re-verify the attributes:
   `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='trellis_app';`
   - both flags must be `f` (see section 8), else RLS is silently inert.
3. Build the app-role connection string: same host/port/db as the owner URL,
   username `trellis_app`, the new password. (From a laptop use
   `DATABASE_PUBLIC_URL`'s host - the `*.proxy.rlwy.net` one;
   `postgres.railway.internal` only resolves inside Railway.)
4. Set the **app service** `DATABASE_URL` to that string. This is the cutover
   moment: the app now runs under RLS. Soak, verify no over-restriction / no
   cross-workspace leakage (section 5), then repeat for production.
5. Keep `STAGING_DATABASE_URL`/`PRODUCTION_DATABASE_URL` GitHub secrets as the
   **owner** connection (migrations must keep running as the owner).
6. Rollback if needed: revert the app `DATABASE_URL` to the owner connection - RLS
   is instantly inert again (owner bypasses), no data lost.

---

## 7. Key files & helpers already in place

- `server/database/connection.ts` - `db` (ALS proxy), `withWorkspace(ctx, fn)`, `withRlsBypass(fn)`, `enterRequestScope`/`bindWorkspaceToScope`/`releaseRequestScope`, `DbScope`.
- `server/middleware/z-workspace-scope.ts` - per-request scope (runs after auth via `z-` prefix).
- `server/api/_debug/scope.get.ts` - super-admin propagation check.
- `server/database/rls.integration.test.ts` - the pattern for creating a non-superuser role + policy and proving enforcement; reuse for 4c.
- `server/utils/workspace.ts` - `assertSameWorkspace`/`getWorkspaceId` (app-level guards; RLS is the DB backstop under them, both stay).

---

## 8. Gotchas

- **Superuser bypass** is the whole reason for the role swap - re-verify with `SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;` that the app role is NOT superuser/bypass after the swap, else RLS is silently inert.
- **`current_setting(..., true)`** (the `true` = missing_ok) returns NULL when unset - policies then match nothing (fail closed). Keep the `, true`.
- **Inserts under bypass** (tasks/super-admin) have no `app.current_workspace_id`, so the column DEFAULT is empty there - those paths must set `workspace_id` explicitly.
- **`DISCARD ALL`** on release resets the connection's GUCs; don't remove it, or a pooled connection could carry one request's context into the next.
- **Don't put RLS on the auth/workspaces tables** - only the ten content tables. Public routes (login, etc.) query users/verification as the app role with no context and must keep working.

---

## 9. After the cutover: what remains in Phase 1

RLS is the last piece of **PR 1b**. Phase 1 also still needs **PR 1c** (not started): **F5** (rate limiting keyed on a spoofable header), **F6** (Slack install state not bound to session), **F7** (dependency upgrades + CI audit gate) - all in `docs/audits/remediation-plan.md`. Plus the launch gate (TRE-50: manual cross-tenant QA + version bump) and F4 (secret rotation, an ops task). Alex wants **all of Phase 1 done before Phase 2**, so pick these up after the cutover.

Linear: project "Audit Remediation: Security & Quality" (TRE team). RLS work is TRE-44 (under TRE-33). PR 1c is TRE-34 (F5=TRE-40, F6=TRE-41, F7=TRE-42).
