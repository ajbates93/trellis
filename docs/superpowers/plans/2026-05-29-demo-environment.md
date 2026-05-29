# Demo Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a self-resetting, side-effect-free demo of Trellis that runs the same `main` code as production, gated behind a single `DEMO_MODE` flag.

**Architecture:** The demo is the production codebase deployed to a separate Railway service + database, with all demo behaviour (email suppression, one-click login, banner, redirect, hidden integrations, reset) driven by one `DEMO_MODE` environment flag. A shared `server/utils/demo.ts` centralises the flag check so every guard is DRY and unit-tested once. Data is reset nightly by a scheduled task and on demand by a secret-guarded endpoint, both calling a single `seedDemo()` routine that hard-refuses to run unless `DEMO_MODE` is true.

**Tech Stack:** Nuxt 4 (Nitro), better-auth (email/password already enabled), Drizzle ORM + PostgreSQL, Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-29-demo-environment-design.md`

---

## File Structure

**New files:**
- `server/utils/demo.ts` - `isDemoMode()` + `assertDemoMode()` helpers (single source of truth)
- `server/utils/demo.test.ts` - unit tests for the helpers
- `server/database/seed-demo.ts` - `seedDemo()` routine (guarded) + the Northwind Studios fixture, plus a CLI entry
- `server/database/seed-demo.test.ts` - guard test
- `server/api/demo/login.post.ts` - one-click admin login (demo-only)
- `server/api/demo/login.post.test.ts` - guard test
- `server/api/demo/reset.post.ts` - manual reset (demo-only, secret-guarded)
- `server/api/demo/reset.post.test.ts` - guard tests
- `server/tasks/demo-reset.ts` - nightly reset scheduled task
- `app/pages/demo.vue` - one-click demo entry page
- `app/middleware/demo-redirect.global.ts` - redirect `/` to `/demo` in demo mode
- `app/utils/demoRedirect.ts` - pure redirect-decision helper
- `app/utils/demoRedirect.test.ts` - unit test for the helper
- `app/components/DemoBanner.vue` - persistent demo banner
- `.github/workflows/deploy-demo.yml` - demo migrations on push to `main`

**Modified files:**
- `nuxt.config.ts` - add `demoMode` to runtime config (private + public); register `demo-reset` scheduled task
- `server/utils/email.ts` - email suppression guard
- `app.vue` - mount `<DemoBanner />` globally
- `app/pages/settings/integrations.vue` - hide Slack section in demo mode
- `.env.example` - document demo env vars
- `package.json` - add `db:seed-demo` script

---

## Task 1: Centralised demo-mode helper

**Files:**
- Create: `server/utils/demo.ts`
- Test: `server/utils/demo.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/utils/demo.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { isDemoMode, assertDemoMode } from "./demo";

describe("demo helpers", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("isDemoMode is false when DEMO_MODE is unset", () => {
    expect(isDemoMode()).toBe(false);
  });

  it("isDemoMode is true only for the exact string 'true'", () => {
    process.env.DEMO_MODE = "true";
    expect(isDemoMode()).toBe(true);
    process.env.DEMO_MODE = "1";
    expect(isDemoMode()).toBe(false);
  });

  it("assertDemoMode throws a 404 when not in demo mode", () => {
    expect(() => assertDemoMode()).toThrowError(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("assertDemoMode is a no-op in demo mode", () => {
    process.env.DEMO_MODE = "true";
    expect(() => assertDemoMode()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/utils/demo.test.ts`
Expected: FAIL - cannot find module `./demo`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/utils/demo.ts
import { createError } from "h3";

/** Single source of truth for whether this deployment is the demo environment. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** Throws a 404 (so demo-only routes are invisible) unless DEMO_MODE is on. */
export function assertDemoMode(): void {
  if (!isDemoMode()) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/utils/demo.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/demo.ts server/utils/demo.test.ts
git commit -m "feat(demo): add centralised demo-mode helper"
```

---

## Task 2: Suppress all outbound email in demo mode

**Files:**
- Modify: `server/utils/email.ts:12` (top of `sendEmail`)
- Test: `server/utils/email.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/utils/email.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

const { sendEmail } = await import("./email");

describe("sendEmail demo-mode suppression", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
    sendMock.mockReset();
  });

  it("does not call Resend when DEMO_MODE is on", async () => {
    process.env.DEMO_MODE = "true";
    const result = await sendEmail({
      to: "a@b.com",
      subject: "hi",
      html: "<p>hi</p>",
    });
    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ suppressed: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/utils/email.test.ts`
Expected: FAIL - Resend `send` is called / no `suppressed` field.

- [ ] **Step 3: Add the guard at the top of `sendEmail`**

In `server/utils/email.ts`, add the import near the other imports and insert the guard as the first statement inside `sendEmail` (before the `fromEmail` line at `:13`):

```typescript
// server/utils/email.ts  (add import at top, below the Resend import)
import { isDemoMode } from "./demo";
```

```typescript
// server/utils/email.ts  (first lines inside `export const sendEmail = async (options) => {`)
  if (isDemoMode()) {
    console.log(
      `📭 [DEMO_MODE] Email suppressed → to:${options.to} subject:"${options.subject}"`,
    );
    return { suppressed: true } as const;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/utils/email.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/email.ts server/utils/email.test.ts
git commit -m "feat(demo): suppress outbound email in demo mode"
```

---

## Task 3: `seedDemo()` routine with hard guard

**Files:**
- Create: `server/database/seed-demo.ts`
- Test: `server/database/seed-demo.test.ts`
- Modify: `package.json` (add `db:seed-demo` script)

**Notes for implementer:** This routine both truncates the app data tables and re-seeds the Northwind Studios fixture. It reuses `hashPassword` from `server/utils/password` so the demo admin can sign in. Delete order must respect foreign keys (mirror the order in `server/database/reset.ts`). The fixture below is generative (loops) to stay DRY; it produces ~20 users, buddy pairings, several months of feedback (mix of published/draft), goals with milestones/notes, completed + upcoming reviews, and achievements. The demo admin's email/password are read from env so they are not hardcoded in source.

- [ ] **Step 1: Write the failing guard test**

```typescript
// server/database/seed-demo.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { seedDemo } from "./seed-demo";

describe("seedDemo guard", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("refuses to run unless DEMO_MODE is true", async () => {
    delete process.env.DEMO_MODE;
    await expect(seedDemo()).rejects.toThrow(/DEMO_MODE/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/database/seed-demo.test.ts`
Expected: FAIL - cannot find module `./seed-demo`.

- [ ] **Step 3: Implement `seed-demo.ts`**

```typescript
// server/database/seed-demo.ts
import "dotenv/config";
import { db, client } from "./connection";
import {
  users,
  feedback,
  feedbackInsights,
  goals,
  goalNotes,
  goalMilestones,
  reviewSchedules,
  achievements,
  notifications,
  onboardingImports,
  buddyCheckins,
  workspaces,
} from "./schema";
import { isDemoMode } from "../utils/demo";
import { hashPassword } from "../utils/password";

const DEMO_WORKSPACE_ID = "demo-workspace";
const DEMO_COMPANY = "Northwind Studios";

const ROLE_TYPES = ["dev", "design", "qa", "growth", "management"] as const;
const FIRST_NAMES = [
  "Ava", "Ben", "Cara", "Dan", "Ella", "Finn", "Gina", "Hugo", "Iris", "Jack",
  "Kira", "Leo", "Mia", "Noah", "Orla", "Pia", "Quin", "Rhys", "Sara", "Tom",
];

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function truncateAppData(): Promise<void> {
  // Order respects FK constraints (children first).
  await db.delete(goalNotes);
  await db.delete(goalMilestones);
  await db.delete(goals);
  await db.delete(buddyCheckins);
  await db.delete(feedbackInsights);
  await db.delete(feedback);
  await db.delete(reviewSchedules);
  await db.delete(achievements);
  await db.delete(notifications);
  await db.delete(onboardingImports);
  await db.delete(users);
  await db.delete(workspaces);
}

/**
 * Wipes and re-seeds the demo dataset. HARD-REFUSES unless DEMO_MODE is true so
 * it can never run against staging/production.
 */
export async function seedDemo(): Promise<void> {
  if (!isDemoMode()) {
    throw new Error("seedDemo refused: DEMO_MODE is not 'true'");
  }

  const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@northwind.demo";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "demo-trellis-1234";

  await truncateAppData();

  // Workspace
  await db.insert(workspaces).values({
    id: DEMO_WORKSPACE_ID,
    name: DEMO_COMPANY,
  });

  const now = new Date();
  const hashed = await hashPassword(adminPassword);

  // Build ~20 users. Index 0 is the admin you log in as.
  type SeedUser = { id: string; email: string; name: string; roleType: string };
  const seedUsers: SeedUser[] = FIRST_NAMES.map((first, i) => ({
    id: `demo-user-${i}`,
    email:
      i === 0
        ? adminEmail
        : `${first.toLowerCase()}@northwind.demo`,
    name: i === 0 ? `${first} (Admin)` : `${first} Carter`,
    roleType: ROLE_TYPES[i % ROLE_TYPES.length],
  }));

  // Insert users; pair buddies (i with i+1 alternating).
  for (let i = 0; i < seedUsers.length; i++) {
    const u = seedUsers[i];
    const buddy = seedUsers[i % 2 === 0 ? i + 1 : i - 1];
    await db.insert(users).values({
      id: u.id,
      email: u.email,
      name: u.name,
      roleType: u.roleType,
      buddyId: buddy ? buddy.id : null,
      workspaceId: DEMO_WORKSPACE_ID,
      emailVerified: true, // real account (not a pre-created invite stub)
      passwordEnabled: i === 0, // only the admin needs to sign in
      role: i === 0 ? "admin" : "user",
      isSuperAdmin: i === 0,
      createdAt: now,
      updatedAt: now,
    });
    if (i === 0) {
      // Give the admin a password account row so signInEmail works.
      const { accounts } = await import("./schema");
      await db.insert(accounts).values({
        id: `demo-account-admin`,
        userId: u.id,
        accountId: u.id,
        providerId: "credential",
        password: hashed,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Feedback: each user receives feedback from several others across ~12 weeks.
  for (let w = 0; w < 12; w++) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - w * 7);
    for (let i = 0; i < seedUsers.length; i++) {
      const reviewer = seedUsers[i];
      const reviewee = seedUsers[(i + 3 + w) % seedUsers.length];
      if (reviewer.id === reviewee.id) continue;
      await db.insert(feedback).values({
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        content: `Great collaboration this week on the ${reviewee.roleType} work. Clear communication and solid follow-through.`,
        weekYear: isoWeek(weekDate),
        published: w > 1, // most published, recent two weeks still drafts
        publishedAt: w > 1 ? weekDate : null,
        isRead: w > 2,
        createdAt: weekDate,
      });
    }
  }

  // Goals (+ a milestone + a note) for the first 12 users.
  for (let i = 0; i < 12; i++) {
    const u = seedUsers[i];
    const [goal] = await db
      .insert(goals)
      .values({
        userId: u.id,
        goalText: `Improve ${u.roleType} skills this quarter`,
        status: i % 4 === 0 ? "completed" : "active",
        targetDate: new Date(now.getFullYear(), now.getMonth() + 2, 1)
          .toISOString()
          .slice(0, 10),
        createdAt: now,
        updatedAt: now,
        completedAt: i % 4 === 0 ? now : null,
      })
      .returning();
    await db.insert(goalMilestones).values({
      goalId: goal.id,
      title: "First checkpoint reached",
      isCompleted: true,
      completedAt: now,
      displayOrder: 0,
    });
    await db.insert(goalNotes).values({
      goalId: goal.id,
      authorId: seedUsers[(i + 1) % seedUsers.length].id,
      noteText: "Nice progress so far - keep it up!",
    });
  }

  // Reviews: one completed (past) + one upcoming for the first 10 users.
  for (let i = 0; i < 10; i++) {
    const u = seedUsers[i];
    const buddy = seedUsers[i % 2 === 0 ? i + 1 : i - 1] || seedUsers[0];
    const past = new Date(now);
    past.setMonth(past.getMonth() - 2);
    const upcoming = new Date(now);
    upcoming.setDate(upcoming.getDate() + 14 + i);
    await db.insert(reviewSchedules).values({
      userId: u.id,
      buddyId: buddy.id,
      scheduledDate: past.toISOString(),
      completedDate: past.toISOString(),
      status: "completed",
      name: "Q1 Review",
    });
    await db.insert(reviewSchedules).values({
      userId: u.id,
      buddyId: buddy.id,
      scheduledDate: upcoming.toISOString(),
      status: "scheduled",
      name: "Q2 Review",
    });
  }

  // Achievements (brag bucket) for the first 8 users.
  for (let i = 0; i < 8; i++) {
    await db.insert(achievements).values({
      userId: seedUsers[i].id,
      title: "Shipped a major feature",
      achievedDate: now.toISOString().slice(0, 10),
    });
  }

  console.log(`✅ Demo seeded: ${DEMO_COMPANY} (${seedUsers.length} users)`);
}

// CLI entry: `npm run db:seed-demo`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemo()
    .then(() => client.end())
    .catch((err) => {
      console.error("❌ seedDemo failed:", err);
      return client.end().then(() => process.exit(1));
    });
}
```

- [ ] **Step 4: Add the npm script**

In `package.json` `scripts`, add after `db:reset`:

```json
    "db:seed-demo": "tsx server/database/seed-demo.ts",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/database/seed-demo.test.ts`
Expected: PASS (the guard rejects when DEMO_MODE is unset).

- [ ] **Step 6: Commit**

```bash
git add server/database/seed-demo.ts server/database/seed-demo.test.ts package.json
git commit -m "feat(demo): add guarded seedDemo routine and fixture"
```

---

## Task 4: Manual reset endpoint

**Files:**
- Create: `server/api/demo/reset.post.ts`
- Test: `server/api/demo/reset.post.test.ts`

**Notes:** Guarded by `assertDemoMode()` (404 outside demo) AND a `DEMO_RESET_SECRET` supplied via the `x-demo-secret` header (403 if wrong/missing). On success it calls `seedDemo()`.

- [ ] **Step 1: Write the failing tests**

```typescript
// server/api/demo/reset.post.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockEvent } from "#server/__tests__/helpers/mock-event";

vi.mock("#server/database/seed-demo", () => ({ seedDemo: vi.fn() }));

const { default: handler } = await import("./reset.post");

describe("POST /api/demo/reset", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
    delete process.env.DEMO_RESET_SECRET;
    vi.clearAllMocks();
  });

  it("404s when not in demo mode", async () => {
    const event = createMockEvent();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("403s when the secret is wrong", async () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_RESET_SECRET = "right";
    const event = createMockEvent({ headers: { "x-demo-secret": "wrong" } });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("resets when the secret matches", async () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_RESET_SECRET = "right";
    const event = createMockEvent({ headers: { "x-demo-secret": "right" } });
    const result = await handler(event);
    expect(result).toMatchObject({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/demo/reset.post.test.ts`
Expected: FAIL - cannot find module `./reset.post`.

> If `createMockEvent` does not accept a `headers` option, read `server/__tests__/helpers/mock-event.ts` and use the supported shape (e.g. set `event.node.req.headers`). Keep the three behaviours (404 / 403 / ok) identical.

- [ ] **Step 3: Implement the endpoint**

```typescript
// server/api/demo/reset.post.ts
import { getHeader } from "h3";
import { assertDemoMode } from "#server/utils/demo";
import { seedDemo } from "#server/database/seed-demo";

export default defineEventHandler(async (event) => {
  assertDemoMode(); // 404 outside demo

  const expected = process.env.DEMO_RESET_SECRET;
  const provided = getHeader(event, "x-demo-secret");
  if (!expected || provided !== expected) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  await seedDemo();
  return { ok: true };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/demo/reset.post.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/api/demo/reset.post.ts server/api/demo/reset.post.test.ts
git commit -m "feat(demo): add secret-guarded manual reset endpoint"
```

---

## Task 5: One-click admin login endpoint

**Files:**
- Create: `server/api/demo/login.post.ts`
- Test: `server/api/demo/login.post.test.ts`

**Notes:** Returns 404 outside demo mode (tested). In demo mode it signs in the seeded admin via better-auth's server API and forwards the session cookie onto the response. The happy-path sign-in is verified manually (Task 12) since it depends on better-auth + a live DB.

- [ ] **Step 1: Write the failing guard test**

```typescript
// server/api/demo/login.post.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { createMockEvent } from "#server/__tests__/helpers/mock-event";

const { default: handler } = await import("./login.post");

describe("POST /api/demo/login", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("404s when not in demo mode", async () => {
    const event = createMockEvent();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/demo/login.post.test.ts`
Expected: FAIL - cannot find module `./login.post`.

- [ ] **Step 3: Implement the endpoint**

```typescript
// server/api/demo/login.post.ts
import { appendResponseHeader } from "h3";
import { assertDemoMode } from "#server/utils/demo";
import { auth } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
  assertDemoMode(); // 404 outside demo

  const email = process.env.DEMO_ADMIN_EMAIL || "admin@northwind.demo";
  const password = process.env.DEMO_ADMIN_PASSWORD || "demo-trellis-1234";

  // Sign in server-side and forward the Set-Cookie header(s) to the client.
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      appendResponseHeader(event, "set-cookie", value);
    }
  }

  return { ok: true, redirect: "/dashboard" };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/demo/login.post.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/demo/login.post.ts server/api/demo/login.post.test.ts
git commit -m "feat(demo): add one-click admin login endpoint"
```

---

## Task 6: Nightly reset scheduled task

**Files:**
- Create: `server/tasks/demo-reset.ts`
- Modify: `nuxt.config.ts` (register the task)

**Notes:** Follows the existing `defineTask` pattern (see `server/tasks/goal-reminders.ts`). It no-ops unless demo mode is on, so it is safe to register everywhere.

- [ ] **Step 1: Implement the task**

```typescript
// server/tasks/demo-reset.ts
import { isDemoMode } from "#server/utils/demo";
import { seedDemo } from "#server/database/seed-demo";

export default defineTask({
  meta: {
    name: "demo-reset",
    description: "Nightly wipe + reseed of the demo environment",
  },
  async run() {
    if (!isDemoMode()) {
      return { result: "skipped: not demo mode" };
    }
    try {
      await seedDemo();
      return { result: "demo reset complete" };
    } catch (error) {
      console.error("[demo-reset] failed:", error);
      return { result: `failed: ${error}` };
    }
  },
});
```

- [ ] **Step 2: Register the task in `nuxt.config.ts`**

Update the `scheduledTasks` block (currently at `nuxt.config.ts:154`) to add a nightly demo reset at 03:00 UTC:

```typescript
    scheduledTasks: {
      "0 9 * * *": ["review-reminders", "goal-reminders"], // Daily at 9 AM UTC
      "0 3 * * *": ["demo-reset"], // Daily at 3 AM UTC (no-op outside demo mode)
    },
```

- [ ] **Step 3: Verify build/type-check passes**

Run: `npx nuxt prepare && npx vitest run server/utils/demo.test.ts`
Expected: prepare succeeds; demo helper tests still PASS. (The task itself is exercised manually in Task 12.)

- [ ] **Step 4: Commit**

```bash
git add server/tasks/demo-reset.ts nuxt.config.ts
git commit -m "feat(demo): add nightly demo-reset scheduled task"
```

---

## Task 7: Add `demoMode` to runtime config + env docs

**Files:**
- Modify: `nuxt.config.ts:38-55` (runtimeConfig)
- Modify: `.env.example`

- [ ] **Step 1: Add `demoMode` to runtime config**

In `nuxt.config.ts`, extend `runtimeConfig` so both server and client can read the flag:

```typescript
  runtimeConfig: {
    // Server-side only (private)
    betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    demoMode: process.env.DEMO_MODE === "true",
    slackClientId: process.env.SLACK_CLIENT_ID || "",
    slackClientSecret: process.env.SLACK_CLIENT_SECRET || "",
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET || "",
    slackTokenEncryptionKey: process.env.SLACK_TOKEN_ENCRYPTION_KEY || "",

    public: {
      baseUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      demoMode: process.env.DEMO_MODE === "true",
      appVersion: process.env.npm_package_version || "0.0.0",
      plausibleToken: process.env.NUXT_PUBLIC_PLAUSIBLE_TOKEN || "",
      sentry: {
        dsn: "", // Set via NUXT_PUBLIC_SENTRY_DSN in production
        environment: process.env.NODE_ENV || "development",
      },
    },
  },
```

- [ ] **Step 2: Document the env vars**

Append to `.env.example`:

```bash
# --- Demo environment (only set these on the demo Railway service) ---
# Turns the whole app into demo mode: email off, one-click login, reset enabled,
# banner shown, integrations hidden, root redirected to the demo login.
DEMO_MODE=false
# Credentials for the single seeded admin account the demo logs you in as.
DEMO_ADMIN_EMAIL=admin@northwind.demo
DEMO_ADMIN_PASSWORD=change-me-demo-password
# Shared secret required (x-demo-secret header) to trigger POST /api/demo/reset.
DEMO_RESET_SECRET=change-me-reset-secret
```

- [ ] **Step 3: Verify prepare passes**

Run: `npx nuxt prepare`
Expected: succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add nuxt.config.ts .env.example
git commit -m "feat(demo): expose demoMode in runtime config and document env"
```

---

## Task 8: Root-to-demo redirect

**Files:**
- Create: `app/utils/demoRedirect.ts`
- Create: `app/utils/demoRedirect.test.ts`
- Create: `app/middleware/demo-redirect.global.ts`

**Notes:** The decision logic is a pure function so it can be unit-tested; the global middleware is a thin wrapper that reads runtime config and calls `navigateTo`.

- [ ] **Step 1: Write the failing test**

```typescript
// app/utils/demoRedirect.test.ts
import { describe, it, expect } from "vitest";
import { demoRedirectTarget } from "./demoRedirect";

describe("demoRedirectTarget", () => {
  it("redirects '/' to '/demo' in demo mode", () => {
    expect(demoRedirectTarget(true, "/")).toBe("/demo");
  });
  it("does not redirect '/' outside demo mode", () => {
    expect(demoRedirectTarget(false, "/")).toBeNull();
  });
  it("does not redirect the demo page itself (avoids a loop)", () => {
    expect(demoRedirectTarget(true, "/demo")).toBeNull();
  });
  it("does not redirect other paths", () => {
    expect(demoRedirectTarget(true, "/dashboard")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/utils/demoRedirect.test.ts`
Expected: FAIL - cannot find module `./demoRedirect`.

- [ ] **Step 3: Implement the helper and middleware**

```typescript
// app/utils/demoRedirect.ts
/** Returns the path to redirect to, or null to allow navigation. */
export function demoRedirectTarget(
  demoMode: boolean,
  path: string,
): string | null {
  if (demoMode && path === "/") return "/demo";
  return null;
}
```

```typescript
// app/middleware/demo-redirect.global.ts
import { demoRedirectTarget } from "~/utils/demoRedirect";

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig();
  const target = demoRedirectTarget(Boolean(config.public.demoMode), to.path);
  if (target) return navigateTo(target);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/utils/demoRedirect.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/utils/demoRedirect.ts app/utils/demoRedirect.test.ts app/middleware/demo-redirect.global.ts
git commit -m "feat(demo): redirect root to demo login in demo mode"
```

---

## Task 9: Demo entry page

**Files:**
- Create: `app/pages/demo.vue`

**Notes:** Public page (`auth: false`). Single button posts to `/api/demo/login`, then hard-navigates to the returned redirect so the new session cookie is picked up. Uses the existing `auth` layout for a centred card (matches `login.vue`).

- [ ] **Step 1: Implement the page**

```vue
<!-- app/pages/demo.vue -->
<template>
  <div class="max-w-md w-full space-y-8 p-8 text-center">
    <div class="flex justify-center">
      <TrellisLogo :size="64" />
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Trellis Demo
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Explore Trellis with realistic sample data. This is a sandbox - it resets
      regularly and sends no real emails.
    </p>
    <UButton
      color="primary"
      size="xl"
      block
      :loading="loading"
      @click="enterDemo"
    >
      Enter the demo
    </UButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
  auth: false,
});

useHead({ title: "Demo" });

const loading = ref(false);
const toast = useToast();

const enterDemo = async () => {
  loading.value = true;
  try {
    const res = await $fetch<{ ok: boolean; redirect: string }>(
      "/api/demo/login",
      { method: "POST" },
    );
    // Hard navigation so the freshly-set session cookie is applied.
    window.location.href = res.redirect;
  } catch {
    loading.value = false;
    toast.add({
      title: "Could not start the demo",
      description: "Please try again in a moment.",
      color: "error",
    });
  }
};
</script>
```

- [ ] **Step 2: Verify it builds**

Run: `npx nuxt prepare`
Expected: succeeds. (Behaviour is verified end-to-end in Task 12.)

- [ ] **Step 3: Commit**

```bash
git add app/pages/demo.vue
git commit -m "feat(demo): add one-click demo entry page"
```

---

## Task 10: Persistent demo banner

**Files:**
- Create: `app/components/DemoBanner.vue`
- Modify: `app.vue`

- [ ] **Step 1: Implement the banner component**

```vue
<!-- app/components/DemoBanner.vue -->
<template>
  <div
    v-if="demoMode"
    class="w-full bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4"
    role="status"
  >
    Demo environment - sample data, no real emails, resets regularly.
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const demoMode = computed(() => Boolean(config.public.demoMode));
</script>
```

- [ ] **Step 2: Mount it globally in `app.vue`**

Add `<DemoBanner />` as the first child inside `<UApp>`:

```vue
<template>
  <UApp>
    <DemoBanner />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <NuxtAnnouncer />
  </UApp>
</template>
```

- [ ] **Step 3: Verify it builds**

Run: `npx nuxt prepare`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/components/DemoBanner.vue app.vue
git commit -m "feat(demo): add persistent demo banner"
```

---

## Task 11: Hide Slack integration in demo mode

**Files:**
- Modify: `app/pages/settings/integrations.vue` (Slack section, around `:85`)

**Notes:** In demo mode the Slack section can't be meaningfully used, so replace it with a short "not available in the demo" notice. Read the file first to wrap the exact Slack section block.

- [ ] **Step 1: Add the demo flag to the page script**

In the `<script setup>` of `app/pages/settings/integrations.vue`, add:

```typescript
const config = useRuntimeConfig();
const demoMode = computed(() => Boolean(config.public.demoMode));
```

- [ ] **Step 2: Gate the Slack section in the template**

Wrap the existing Slack Integration section (the block beginning with the `<!-- Slack Integration Section -->` comment near line 85) with `v-if="!demoMode"`, and add a sibling notice shown only in demo mode immediately after it:

```vue
<div
  v-if="demoMode"
  class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-400"
>
  Integrations are disabled in the demo environment.
</div>
```

- [ ] **Step 3: Verify it builds**

Run: `npx nuxt prepare`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/pages/settings/integrations.vue
git commit -m "feat(demo): hide Slack integration in demo mode"
```

---

## Task 12: Deploy workflow + end-to-end verification

**Files:**
- Create: `.github/workflows/deploy-demo.yml`

**Notes:** Mirrors `deploy-staging.yml`. Railway auto-deploys the demo service from `main`; this workflow only runs migrations against the demo DB on push to `main`. First-time seeding is a manual bootstrap (below); ongoing freshness comes from the nightly `demo-reset` task.

- [ ] **Step 1: Create the workflow**

```yaml
# .github/workflows/deploy-demo.yml
name: Deploy to Demo

on:
  push:
    branches:
      - main

jobs:
  migrate:
    name: Run Demo Migrations
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DEMO_DATABASE_URL }}
```

- [ ] **Step 2: Document Railway + GitHub setup (manual, one-time)**

Record these steps in the PR description (no code change required):
1. Create a new Railway service `trellis-demo` + a new PostgreSQL database in the same project.
2. Set the service to deploy from the `main` branch.
3. Set env vars on the demo service: `DEMO_MODE=true`, `DATABASE_URL` (demo DB), a unique `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the Railway-generated demo domain), `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_RESET_SECRET`.
4. Add a GitHub Actions secret `DEMO_DATABASE_URL` pointing at the demo DB.

- [ ] **Step 3: Bootstrap + verify the demo end-to-end (against the deployed demo, or locally with `DEMO_MODE=true`)**

Local dry run:
```bash
DEMO_MODE=true npm run db:seed-demo
```
Expected: prints `✅ Demo seeded: Northwind Studios (20 users)`.

Then with the app running in demo mode (`DEMO_MODE=true npm run dev`), verify:
- Visiting `/` redirects to `/demo`.
- The amber demo banner is visible.
- "Enter the demo" logs you straight into the dashboard as the admin (no Google OAuth).
- Dashboard charts, feedback inbox, goals, reviews and AI insights are populated.
- Settings → Integrations shows the "disabled in the demo" notice, not the Slack connect UI.
- Triggering any email path produces a `📭 [DEMO_MODE] Email suppressed` log and sends nothing.
- `curl -X POST -H "x-demo-secret: <DEMO_RESET_SECRET>" localhost:3000/api/demo/reset` returns `{"ok":true}` and re-seeds.
- `curl -X POST localhost:3000/api/demo/reset` (no secret) returns 403.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-demo.yml
git commit -m "ci(demo): add demo deploy migrations workflow"
```

---

## Self-Review Notes

- **Spec coverage:** infra/CI (Tasks 7,12), `DEMO_MODE` flag (Tasks 1,7), email off (Task 2), one-click login (Tasks 5,9), nightly+manual reset (Tasks 3,4,6), banner (Task 10), root redirect (Task 8), hidden integrations (Task 11), ~20-person seed (Task 3), AI insights left live (no change - covered by omission). All spec sections map to a task.
- **Safety:** `seedDemo()` and both demo endpoints independently refuse outside demo mode; reset additionally requires `DEMO_RESET_SECRET`.
- **Naming consistency:** `isDemoMode`/`assertDemoMode` (server), `config.public.demoMode` (client), `demoRedirectTarget`, `seedDemo` used consistently across tasks.
- **Known integration-dependent step:** `auth.api.signInEmail({ asResponse: true })` (Task 5) is verified manually in Task 12, as it needs a live better-auth + DB; the unit test covers only the 404 guard.
