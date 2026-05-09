# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app notifications to Trellis: a sidebar bell-popover + dedicated inbox page driven by per-user notification rows, plus email parity for review create / reschedule / cancel events.

**Architecture:** New `notifications` table (per-recipient event log). A `createNotification()` helper is called from the same code paths that already emit emails. A `shouldEmail()` helper replaces the coarse `users.emailNotifications` boolean with per-category preferences stored in a jsonb column. Four REST endpoints (list / unread-count / read / mark-all-read) feed a `NotificationsPopover` and a `/notifications` page. A new daily cron emits goal-approaching / goal-overdue.

**Tech Stack:** Nuxt 4, Drizzle ORM, PostgreSQL, Better-auth, Nuxt UI, Vitest, Resend (email), nitro scheduledTasks.

**Spec:** `docs/superpowers/specs/2026-05-08-notifications-design.md`

---

## File Structure

**New files:**

| Path | Responsibility |
|---|---|
| `server/database/migrations/0016_notifications.sql` (auto-named by Drizzle) | DDL for `notifications` + swap `email_notifications` → `email_notification_preferences` |
| `server/utils/inAppNotifications.ts` | `createNotification()` helper + `NotificationType` union |
| `server/utils/emailPreferences.ts` | `shouldEmail(userId, category)` helper |
| `server/api/notifications/index.get.ts` (+ `.test.ts`) | List endpoint, cursor pagination |
| `server/api/notifications/unread-count.get.ts` (+ `.test.ts`) | Unread count for the bell badge |
| `server/api/notifications/[id]/read.patch.ts` (+ `.test.ts`) | Mark single read |
| `server/api/notifications/mark-all-read.post.ts` (+ `.test.ts`) | Bulk mark read |
| `server/tasks/goal-reminders.ts` (+ `server/__tests__/goal-reminders.test.ts`) | Daily cron — goal_approaching + goal_overdue |
| `app/composables/useNotifications.ts` | Client cache for unread count + popover items |
| `app/components/NotificationsPopover.vue` | The bell popover content |
| `app/pages/notifications.vue` | Full inbox page |

**Modified files:**

| Path | Change |
|---|---|
| `server/database/schema.ts` | Add `notifications` table + relation; replace `emailNotifications` with `emailNotificationPreferences` |
| `server/schemas/api.ts` | Schemas for new endpoints |
| `server/utils/email.ts` | 4 new templates (review created/rescheduled/cancelled/completed) |
| `server/utils/notifications.ts` | Use `shouldEmail()`; also emit in-app notifications |
| `server/api/feedback/[id]/publish.patch.ts` | Emit `feedback_received` + `buddy_feedback_received` |
| `server/api/feedback/publish-batch.post.ts` | Same |
| `server/api/reviews/index.post.ts` | Emit `review_created` + send email |
| `server/api/reviews/[id]/index.patch.ts` | Emit `review_rescheduled` + send email when `scheduledDate` changes |
| `server/api/reviews/[id]/index.delete.ts` | Emit `review_cancelled` + send email before deletion |
| `server/api/reviews/[id]/complete.patch.ts` | Emit `review_completed` |
| `server/tasks/review-reminders.ts` | Emit `review_reminder` in-app alongside email |
| `app/layouts/default.vue` | Insert Notifications nav item below Dashboard, wrapped in popover |
| `app/components/SidebarNavigation.vue` | Add `notificationsSlot` slot rendered between Dashboard and Personal section |
| `app/pages/settings/notifications.vue` | Restructure to two-column (In-app / Email) per category |
| `nuxt.config.ts` | Register `goal-reminders` in `scheduledTasks` (daily) |

---

## Phase 1 — Foundation (schema + helpers)

### Task 1: Add notifications table and replace emailNotifications column

**Files:**
- Modify: `server/database/schema.ts`
- Create: `server/database/migrations/<n>_notifications.sql` (Drizzle generates the filename)

- [ ] **Step 1: Add notifications table to schema**

In `server/database/schema.ts`, add `jsonb` to the imports:

```ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
```

Add this table definition after `achievementsRelations`:

```ts
// Notifications table (in-app event log per recipient)
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 2: Swap users.emailNotifications for emailNotificationPreferences**

In the same file, in the `users` table definition replace:

```ts
emailNotifications: boolean("email_notifications").default(true),
```

with:

```ts
emailNotificationPreferences: jsonb("email_notification_preferences")
  .$type<Record<string, boolean>>()
  .default({}),
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`

Expected: a new file in `server/database/migrations/` (next sequential number, likely `0016_*.sql`).

- [ ] **Step 4: Edit the generated migration to add backfill + indexes**

Open the new migration file. Verify it includes:
- `CREATE TABLE "notifications" (...)`
- `ALTER TABLE "users" ADD COLUMN "email_notification_preferences" jsonb DEFAULT '{}';`
- `ALTER TABLE "users" DROP COLUMN "email_notifications";`

If Drizzle generated those as separate statements split by `--> statement-breakpoint`, insert these statements **before** the `DROP COLUMN`:

```sql
--> statement-breakpoint
UPDATE "users"
SET "email_notification_preferences" = jsonb_build_object(
  'feedback_received', false,
  'buddy_feedback_received', false,
  'review_created', false,
  'review_rescheduled', false,
  'review_cancelled', false,
  'review_completed', false,
  'review_reminder', false
)
WHERE "email_notifications" = false;
--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" ("user_id", "read_at");
--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at" DESC);
```

- [ ] **Step 5: Apply migration locally**

Run: `npm run db:migrate`

Expected output: migration runs without error. Verify with `npm run db:studio` or `psql`:
- `\d notifications` — table exists with expected columns and indexes.
- `\d users` — `email_notification_preferences` exists, `email_notifications` is gone.

- [ ] **Step 6: Commit**

```bash
git add server/database/schema.ts server/database/migrations/
git commit -m "feat(db): add notifications table and swap email preferences to jsonb"
```

---

### Task 2: Add Zod schemas for notification API

**Files:**
- Modify: `server/schemas/api.ts`

- [ ] **Step 1: Add notification schemas to api.ts**

Append to the end of `server/schemas/api.ts`:

```ts
// Notifications -------------------------------------------------------------

export const NotificationTypeSchema = z.enum([
  "feedback_received",
  "buddy_feedback_received",
  "review_created",
  "review_rescheduled",
  "review_cancelled",
  "review_completed",
  "review_reminder",
  "goal_approaching",
  "goal_overdue",
]);

export const NotificationSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  link: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ListNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
  filter: z.enum(["all", "unread"]).default("all"),
});

export const ListNotificationsResponseSchema = z.object({
  items: z.array(NotificationSchema),
  nextCursor: z.string().datetime().nullable(),
});

export const NotificationUnreadCountResponseSchema = z.object({
  count: z.int().nonnegative(),
});

export const MarkNotificationReadResponseSchema = z.object({
  success: z.literal(true),
});

export const MarkAllNotificationsReadResponseSchema = z.object({
  success: z.literal(true),
  updated: z.int().nonnegative(),
});
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`

Expected: no errors. (If schemas are unused at this point, that's fine — they get referenced in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add server/schemas/api.ts
git commit -m "feat(schemas): add notification API schemas"
```

---

### Task 3: createNotification helper (TDD)

**Files:**
- Create: `server/utils/inAppNotifications.ts`
- Create: `server/utils/inAppNotifications.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/utils/inAppNotifications.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";

const { mockDb } = createMockDb();

vi.mock("../database/connection", () => ({ db: mockDb }));

const { createNotification } = await import("./inAppNotifications");

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a notification row for the given user", async () => {
    const insertReturning = vi.fn().mockResolvedValue([{ id: "abc" }]);
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    mockDb.insert = vi.fn().mockReturnValue({ values: insertValues });

    await createNotification({
      userId: "user-1",
      type: "feedback_received",
      title: "New feedback from Alex",
      link: "/feedback/inbox",
      metadata: { feedbackId: "fb-1" },
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "feedback_received",
        title: "New feedback from Alex",
        link: "/feedback/inbox",
        metadata: { feedbackId: "fb-1" },
      }),
    );
  });

  it("swallows errors and does not throw (fire-and-forget)", async () => {
    mockDb.insert = vi.fn().mockImplementation(() => {
      throw new Error("db down");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createNotification({
        userId: "user-1",
        type: "feedback_received",
        title: "x",
        link: "/x",
      }),
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/utils/inAppNotifications.test.ts`
Expected: FAIL — `Cannot find module './inAppNotifications'`.

- [ ] **Step 3: Write minimal implementation**

Create `server/utils/inAppNotifications.ts`:

```ts
import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";

export type NotificationType =
  | "feedback_received"
  | "buddy_feedback_received"
  | "review_created"
  | "review_rescheduled"
  | "review_cancelled"
  | "review_completed"
  | "review_reminder"
  | "goal_approaching"
  | "goal_overdue";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a notification row for a recipient. Fire-and-forget:
 * logs errors but never throws so callers can call without try/catch.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link,
        metadata: input.metadata ?? {},
      })
      .returning();
  } catch (error) {
    console.error("[createNotification] failed:", error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/utils/inAppNotifications.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/inAppNotifications.ts server/utils/inAppNotifications.test.ts
git commit -m "feat(notifications): add createNotification helper"
```

---

### Task 4: shouldEmail helper (TDD)

**Files:**
- Create: `server/utils/emailPreferences.ts`
- Create: `server/utils/emailPreferences.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/utils/emailPreferences.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../database/connection", () => ({ db: mockDb }));

const { shouldEmail } = await import("./emailPreferences");

describe("shouldEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when preferences are missing the category (default on)", async () => {
    mockSelect([{ emailNotificationPreferences: {} }]);
    expect(await shouldEmail("u1", "feedback_received")).toBe(true);
  });

  it("returns false when category explicitly set to false", async () => {
    mockSelect([{ emailNotificationPreferences: { feedback_received: false } }]);
    expect(await shouldEmail("u1", "feedback_received")).toBe(false);
  });

  it("returns true when category explicitly set to true", async () => {
    mockSelect([{ emailNotificationPreferences: { feedback_received: true } }]);
    expect(await shouldEmail("u1", "feedback_received")).toBe(true);
  });

  it("returns true when user has null preferences", async () => {
    mockSelect([{ emailNotificationPreferences: null }]);
    expect(await shouldEmail("u1", "review_reminder")).toBe(true);
  });

  it("returns false when user not found", async () => {
    mockSelect([]);
    expect(await shouldEmail("missing", "feedback_received")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/utils/emailPreferences.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/utils/emailPreferences.ts`:

```ts
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import type { NotificationType } from "./inAppNotifications";

export type EmailCategory = Extract<
  NotificationType,
  | "feedback_received"
  | "buddy_feedback_received"
  | "review_created"
  | "review_rescheduled"
  | "review_cancelled"
  | "review_completed"
  | "review_reminder"
>;

/**
 * Returns true if the given user wants email for a given category.
 * Default-on: missing key in preferences = enabled.
 * Returns false only when the user has explicitly opted out, or the user does not exist.
 */
export async function shouldEmail(
  userId: string,
  category: EmailCategory,
): Promise<boolean> {
  const [row] = await db
    .select({ emailNotificationPreferences: users.emailNotificationPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return false;
  const prefs = row.emailNotificationPreferences ?? {};
  return prefs[category] !== false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/utils/emailPreferences.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailPreferences.ts server/utils/emailPreferences.test.ts
git commit -m "feat(notifications): add shouldEmail helper"
```

---

### Task 5: Migrate existing notifications.ts to shouldEmail + in-app emission

**Files:**
- Modify: `server/utils/notifications.ts`

- [ ] **Step 1: Replace emailNotifications checks with shouldEmail**

Open `server/utils/notifications.ts` and rewrite the file as:

```ts
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail, emailTemplates } from "./email";
import { shouldEmail } from "./emailPreferences";
import { createNotification } from "./inAppNotifications";

/**
 * Notify a reviewee's buddy that new feedback has been submitted.
 * In-app notification + (if buddy opts in) email. Fire-and-forget.
 */
export async function notifyBuddyOfNewFeedback(revieweeId: string) {
  try {
    const [reviewee] = await db
      .select({
        name: users.name,
        preferredName: users.preferredName,
        buddyId: users.buddyId,
      })
      .from(users)
      .where(eq(users.id, revieweeId))
      .limit(1);

    if (!reviewee?.buddyId) return;

    const [buddy] = await db
      .select({
        name: users.name,
        preferredName: users.preferredName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, reviewee.buddyId))
      .limit(1);

    if (!buddy) return;

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const buddyName = buddy.preferredName || buddy.name;
    const revieweeName = reviewee.preferredName || reviewee.name;

    // In-app notification (always)
    await createNotification({
      userId: reviewee.buddyId,
      type: "buddy_feedback_received",
      title: `New feedback for ${revieweeName} to review`,
      link: "/feedback/inbox",
      metadata: { revieweeId },
    });

    // Email (per preference)
    if (await shouldEmail(reviewee.buddyId, "buddy_feedback_received")) {
      await sendEmail({
        to: buddy.email,
        subject: "New feedback to review on Trellis",
        html: emailTemplates.buddyFeedbackReceived(buddyName, revieweeName, appUrl),
      });
    }
  } catch (error) {
    console.error("Failed to send buddy notification email:", error);
  }
}

// Debounce state for published feedback notifications.
const DEBOUNCE_MS = 5000;
const pendingRevieweeIds = new Set<string>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPublishedFeedbackNotifications() {
  const ids = [...pendingRevieweeIds];
  pendingRevieweeIds.clear();
  debounceTimer = null;

  if (ids.length === 0) return;

  try {
    const reviewees = await db
      .select({
        id: users.id,
        name: users.name,
        preferredName: users.preferredName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, ids));

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

    for (const reviewee of reviewees) {
      const revieweeName = reviewee.preferredName || reviewee.name;

      // In-app notification
      await createNotification({
        userId: reviewee.id,
        type: "feedback_received",
        title: "You have new feedback",
        link: "/feedback/inbox",
        metadata: {},
      });

      // Email
      if (await shouldEmail(reviewee.id, "feedback_received")) {
        sendEmail({
          to: reviewee.email,
          subject: "You have new feedback on Trellis",
          html: emailTemplates.feedbackPublished(revieweeName, appUrl),
        }).catch((error) => {
          console.error(`Failed to send published feedback email to ${reviewee.email}:`, error);
        });
      }
    }
  } catch (error) {
    console.error("Failed to send published feedback notification emails:", error);
  }
}

/**
 * Notify reviewees that their feedback has been published.
 * 5-second debounce so rapid individual publishes for the same reviewee
 * only result in a single email.
 */
export function notifyRevieweeOfPublishedFeedback(revieweeIds: string[]) {
  for (const id of revieweeIds) {
    pendingRevieweeIds.add(id);
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    flushPublishedFeedbackNotifications();
  }, DEBOUNCE_MS);
}
```

- [ ] **Step 2: Run existing tests that touch this module**

Run: `npx vitest run server/api/feedback`
Expected: existing tests still pass. If a test fails because it asserted on the old `emailNotifications` flow, update its mocks to use `emailNotificationPreferences` (the table column changed) — the behaviour from the test's perspective should remain correct.

- [ ] **Step 3: Commit**

```bash
git add server/utils/notifications.ts
git commit -m "feat(notifications): use shouldEmail + emit in-app notifications"
```

---

## Phase 2 — REST endpoints

### Task 6: GET /api/notifications/unread-count (TDD)

**Files:**
- Create: `server/api/notifications/unread-count.get.ts`
- Create: `server/api/notifications/unread-count.get.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/api/notifications/unread-count.get.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((data: unknown) => data),
}));

const { default: handler } = await import("./unread-count.get");

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const event = createUnauthenticatedEvent();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns the count of unread notifications", async () => {
    mockSelect([{ id: "1" }, { id: "2" }]);
    const event = createAuthenticatedEvent();
    const result = await handler(event);
    expect(result).toEqual({ count: 2 });
  });

  it("returns 0 when there are none", async () => {
    mockSelect([]);
    const event = createAuthenticatedEvent();
    const result = await handler(event);
    expect(result).toEqual({ count: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/notifications/unread-count.get.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/api/notifications/unread-count.get.ts`:

```ts
import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt),
      ),
    );

  return validateResponse(
    { count: rows.length },
    apiSchemas.NotificationUnreadCountResponseSchema,
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/notifications/unread-count.get.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/api/notifications/unread-count.get.ts server/api/notifications/unread-count.get.test.ts
git commit -m "feat(notifications): add unread-count endpoint"
```

---

### Task 7: GET /api/notifications (list with pagination)

**Files:**
- Create: `server/api/notifications/index.get.ts`
- Create: `server/api/notifications/index.get.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/api/notifications/index.get.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((d: unknown) => d),
  validateQuery: vi.fn(async (event: { query?: Record<string, unknown> }) => ({
    limit: 20,
    filter: "all" as const,
    cursor: undefined,
    ...(event.query ?? {}),
  })),
}));

const { default: handler } = await import("./index.get");

const sample = (overrides: Record<string, unknown> = {}) => ({
  id: "n1",
  userId: "u1",
  type: "feedback_received",
  title: "t",
  body: null,
  link: "/feedback/inbox",
  metadata: {},
  readAt: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  ...overrides,
});

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns items with nextCursor null when fewer than limit", async () => {
    mockSelect([sample()]);
    const event = createAuthenticatedEvent({ query: { limit: 20, filter: "all" } });
    const result = await handler(event);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when result is at limit", async () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      sample({ id: `n${i}`, createdAt: new Date(2026, 4, 1, 10, 0, i) }),
    );
    mockSelect(rows);
    const event = createAuthenticatedEvent({ query: { limit: 20, filter: "all" } });
    const result = await handler(event);
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe(rows[19].createdAt.toISOString());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/notifications/index.get.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/api/notifications/index.get.ts`:

```ts
import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull, lt, desc } from "drizzle-orm";
import { validateQuery, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  const { limit, cursor, filter } = await validateQuery(
    event,
    apiSchemas.ListNotificationsQuerySchema,
  );

  const conditions = [eq(notifications.userId, session.user.id)];
  if (filter === "unread") conditions.push(isNull(notifications.readAt));
  if (cursor) conditions.push(lt(notifications.createdAt, new Date(cursor)));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const nextCursor =
    rows.length === limit ? rows[rows.length - 1]!.createdAt.toISOString() : null;

  const items = rows.map((r) => ({
    ...r,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return validateResponse(
    { items, nextCursor },
    apiSchemas.ListNotificationsResponseSchema,
  );
});
```

- [ ] **Step 4: Verify validateQuery exists in validation utils**

Run: `grep -n "validateQuery" server/utils/validation.ts`

If it does NOT exist, open `server/utils/validation.ts` and add:

```ts
import type { ZodType } from "zod";
import type { H3Event } from "h3";

export async function validateQuery<T>(
  event: H3Event,
  schema: ZodType<T>,
): Promise<T> {
  const query = getQuery(event);
  const result = schema.safeParse(query);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid query: ${result.error.message}`,
    });
  }
  return result.data;
}
```

(Adjust imports/types to match the existing file. Do NOT change `validateBody` or `validateResponse`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/api/notifications/index.get.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add server/api/notifications/index.get.ts server/api/notifications/index.get.test.ts server/utils/validation.ts
git commit -m "feat(notifications): add list endpoint with cursor pagination"
```

---

### Task 8: PATCH /api/notifications/:id/read (TDD)

**Files:**
- Create: `server/api/notifications/[id]/read.patch.ts`
- Create: `server/api/notifications/[id]/read.patch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/api/notifications/[id]/read.patch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb } = createMockDb();

vi.mock("../../../database/connection", () => ({ db: mockDb }));
vi.mock("../../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((d: unknown) => d),
}));

const { default: handler } = await import("./read.patch");

describe("PATCH /api/notifications/:id/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await expect(
      handler(createUnauthenticatedEvent({ params: { id: "n1" } })),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 400 when id missing", async () => {
    await expect(
      handler(createAuthenticatedEvent({ params: {} })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("marks the notification read for the current user", async () => {
    const updateWhere = vi.fn().mockResolvedValue([{ id: "n1" }]);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    mockDb.update = vi.fn().mockReturnValue({ set: updateSet });

    const result = await handler(createAuthenticatedEvent({ params: { id: "n1" } }));
    expect(result).toEqual({ success: true });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ readAt: expect.any(Date) }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/notifications/\[id\]/read.patch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/api/notifications/[id]/read.patch.ts`:

```ts
import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Notification id is required" });
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt),
      ),
    );

  return validateResponse(
    { success: true },
    apiSchemas.MarkNotificationReadResponseSchema,
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/notifications/\[id\]/read.patch.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "server/api/notifications/[id]/read.patch.ts" "server/api/notifications/[id]/read.patch.test.ts"
git commit -m "feat(notifications): add mark-read endpoint"
```

---

### Task 9: POST /api/notifications/mark-all-read (TDD)

**Files:**
- Create: `server/api/notifications/mark-all-read.post.ts`
- Create: `server/api/notifications/mark-all-read.post.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/api/notifications/mark-all-read.post.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((d: unknown) => d),
}));

const { default: handler } = await import("./mark-all-read.post");

describe("POST /api/notifications/mark-all-read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns the number of rows updated", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    const where = vi.fn().mockReturnValue({ returning });
    const setFn = vi.fn().mockReturnValue({ where });
    mockDb.update = vi.fn().mockReturnValue({ set: setFn });

    const result = await handler(createAuthenticatedEvent());
    expect(result).toEqual({ success: true, updated: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/notifications/mark-all-read.post.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/api/notifications/mark-all-read.post.ts`:

```ts
import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  return validateResponse(
    { success: true, updated: updated.length },
    apiSchemas.MarkAllNotificationsReadResponseSchema,
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/notifications/mark-all-read.post.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/api/notifications/mark-all-read.post.ts server/api/notifications/mark-all-read.post.test.ts
git commit -m "feat(notifications): add mark-all-read endpoint"
```

---

## Phase 3 — Email templates + emission integration

### Task 10: New email templates for review lifecycle events

**Files:**
- Modify: `server/utils/email.ts`

- [ ] **Step 1: Add four templates to emailTemplates**

Open `server/utils/email.ts`. Inside the `emailTemplates` object (after `passwordReset`), add:

```ts
reviewCreated: (
  recipientName: string,
  otherPartyName: string,
  reviewDate: string,
  appUrl: string,
) => `
  <!DOCTYPE html>
  <html>
    <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">New review scheduled</h1>
        <p>Hi ${recipientName},</p>
        <p>${otherPartyName} has scheduled a review with you on <strong>${reviewDate}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/reviews" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">View review</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Trellis</p>
      </div>
    </body>
  </html>
`,

reviewRescheduled: (
  recipientName: string,
  otherPartyName: string,
  reviewDate: string,
  appUrl: string,
) => `
  <!DOCTYPE html>
  <html>
    <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Review rescheduled</h1>
        <p>Hi ${recipientName},</p>
        <p>${otherPartyName} has rescheduled your review. The new date is <strong>${reviewDate}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/reviews" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">View review</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Trellis</p>
      </div>
    </body>
  </html>
`,

reviewCancelled: (
  recipientName: string,
  otherPartyName: string,
  reviewDate: string,
  appUrl: string,
) => `
  <!DOCTYPE html>
  <html>
    <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Review cancelled</h1>
        <p>Hi ${recipientName},</p>
        <p>${otherPartyName} has cancelled the review previously scheduled for <strong>${reviewDate}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/reviews" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">View reviews</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Trellis</p>
      </div>
    </body>
  </html>
`,

reviewCompleted: (
  recipientName: string,
  otherPartyName: string,
  appUrl: string,
) => `
  <!DOCTYPE html>
  <html>
    <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Review marked complete</h1>
        <p>Hi ${recipientName},</p>
        <p>${otherPartyName} has marked your review as complete.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/reviews" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">View review</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Trellis</p>
      </div>
    </body>
  </html>
`,
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/utils/email.ts
git commit -m "feat(email): add review lifecycle templates"
```

---

### Task 11: Emit notifications + emails from review create

**Files:**
- Modify: `server/api/reviews/index.post.ts`
- Modify: `server/api/reviews/index.post.test.ts`

- [ ] **Step 1: Update the handler**

Open `server/api/reviews/index.post.ts`. Replace its contents with the version below (only the part after `[newReview] = await db.insert(...)` is new — emission of in-app notification + email to the reviewee):

After the existing `.returning();` block that produces `newReview`, before the existing `return validateResponse(...)`, insert:

```ts
    // Notify the reviewee (in-app always; email if opted in)
    try {
      const [reviewee] = await db
        .select({ name: users.name, preferredName: users.preferredName, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const [buddy] = await db
        .select({ name: users.name, preferredName: users.preferredName })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (reviewee && buddy) {
        const revieweeName = reviewee.preferredName || reviewee.name;
        const buddyName = buddy.preferredName || buddy.name;
        const dateStr = format(selectedDate, "EEEE d MMMM yyyy");
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        await createNotification({
          userId,
          type: "review_created",
          title: `${buddyName} scheduled a review with you`,
          body: dateStr,
          link: `/reviews/${newReview.id}`,
          metadata: { reviewId: newReview.id, actorId: session.user.id },
        });

        if (await shouldEmail(userId, "review_created")) {
          await sendEmail({
            to: reviewee.email,
            subject: `New review scheduled with ${buddyName}`,
            html: emailTemplates.reviewCreated(revieweeName, buddyName, dateStr, appUrl),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Failed to send review_created notifications:", notifyErr);
    }
```

Add these imports at the top of the file:

```ts
import { createNotification } from "#server/utils/inAppNotifications";
import { shouldEmail } from "#server/utils/emailPreferences";
import { sendEmail, emailTemplates } from "#server/utils/email";
```

- [ ] **Step 2: Update the test**

Open `server/api/reviews/index.post.test.ts`. Mock the new utilities at the top:

```ts
vi.mock("#server/utils/inAppNotifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("#server/utils/emailPreferences", () => ({
  shouldEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("#server/utils/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    reviewCreated: vi.fn(() => "<html></html>"),
  },
}));
```

Add a new test (place after the existing happy-path test):

```ts
import { createNotification } from "#server/utils/inAppNotifications";
import { sendEmail } from "#server/utils/email";

it("emits in-app notification and email on review creation", async () => {
  // ... existing happy-path setup that results in a successful create ...
  // After invoking the handler:
  expect(createNotification).toHaveBeenCalledWith(
    expect.objectContaining({ type: "review_created" }),
  );
  expect(sendEmail).toHaveBeenCalled();
});
```

(If existing test setup is reused via a beforeEach, just add the assertion — don't duplicate the setup.)

- [ ] **Step 3: Run tests**

Run: `npx vitest run server/api/reviews/index.post.test.ts`
Expected: PASS, including the new assertion.

- [ ] **Step 4: Commit**

```bash
git add server/api/reviews/index.post.ts server/api/reviews/index.post.test.ts
git commit -m "feat(reviews): emit notification + email on review creation"
```

---

### Task 12: Emit notifications + emails from review update / delete / complete

**Files:**
- Modify: `server/api/reviews/[id]/index.patch.ts` (+ test)
- Modify: `server/api/reviews/[id]/index.delete.ts` (+ test)
- Modify: `server/api/reviews/[id]/complete.patch.ts` (+ test)

- [ ] **Step 1: Add reschedule emission to PATCH handler**

In `server/api/reviews/[id]/index.patch.ts`, after the `[updatedReview] = await db.update(...)` line, before the `return validateResponse(...)`, insert:

```ts
    // If the scheduled date changed, emit reschedule notification + email to the OTHER party
    const dateChanged =
      scheduledDate !== undefined &&
      new Date(scheduledDate).getTime() !== new Date(existingReview.scheduledDate).getTime();

    if (dateChanged) {
      try {
        const recipientId =
          existingReview.userId === session.user.id
            ? existingReview.buddyId
            : existingReview.userId;

        const [recipient] = await db
          .select({ name: users.name, preferredName: users.preferredName, email: users.email })
          .from(users)
          .where(eq(users.id, recipientId))
          .limit(1);

        const [actor] = await db
          .select({ name: users.name, preferredName: users.preferredName })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);

        if (recipient && actor) {
          const recipientName = recipient.preferredName || recipient.name;
          const actorName = actor.preferredName || actor.name;
          const dateStr = format(new Date(scheduledDate!), "EEEE d MMMM yyyy");
          const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

          await createNotification({
            userId: recipientId,
            type: "review_rescheduled",
            title: `${actorName} rescheduled your review`,
            body: dateStr,
            link: `/reviews/${reviewId}`,
            metadata: { reviewId, actorId: session.user.id },
          });

          if (await shouldEmail(recipientId, "review_rescheduled")) {
            await sendEmail({
              to: recipient.email,
              subject: `Review rescheduled by ${actorName}`,
              html: emailTemplates.reviewRescheduled(recipientName, actorName, dateStr, appUrl),
            });
          }
        }
      } catch (notifyErr) {
        console.error("Failed to send review_rescheduled notifications:", notifyErr);
      }
    }
```

Add at the top of the file:

```ts
import { format } from "date-fns";
import { users } from "#server/database/schema"; // (extend the existing import to include users)
import { createNotification } from "#server/utils/inAppNotifications";
import { shouldEmail } from "#server/utils/emailPreferences";
import { sendEmail, emailTemplates } from "#server/utils/email";
```

(Be careful: the existing import is `import { reviewSchedules } from "#server/database/schema";` — extend it, don't duplicate.)

- [ ] **Step 2: Add cancel emission to DELETE handler**

In `server/api/reviews/[id]/index.delete.ts`, BEFORE the `await db.delete(reviewSchedules)...` line, add:

```ts
    // Emit cancellation notification + email to the OTHER party (they were notified of the original)
    try {
      const recipientId =
        existingReview.userId === session.user.id
          ? existingReview.buddyId
          : existingReview.userId;

      const [recipient] = await db
        .select({ name: users.name, preferredName: users.preferredName, email: users.email })
        .from(users)
        .where(eq(users.id, recipientId))
        .limit(1);

      const [actor] = await db
        .select({ name: users.name, preferredName: users.preferredName })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (recipient && actor) {
        const recipientName = recipient.preferredName || recipient.name;
        const actorName = actor.preferredName || actor.name;
        const dateStr = format(new Date(existingReview.scheduledDate), "EEEE d MMMM yyyy");
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        await createNotification({
          userId: recipientId,
          type: "review_cancelled",
          title: `${actorName} cancelled your review`,
          body: dateStr,
          link: "/reviews",
          metadata: { reviewId, actorId: session.user.id },
        });

        if (await shouldEmail(recipientId, "review_cancelled")) {
          await sendEmail({
            to: recipient.email,
            subject: `Review cancelled by ${actorName}`,
            html: emailTemplates.reviewCancelled(recipientName, actorName, dateStr, appUrl),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Failed to send review_cancelled notifications:", notifyErr);
    }
```

Add the same imports as in step 1 (date-fns format, users, helpers).

- [ ] **Step 3: Add completion emission to complete handler**

In `server/api/reviews/[id]/complete.patch.ts`, after the `[updated] = await db.update(...)` line, before `return validateResponse(...)`, insert:

```ts
    // Emit completion notification + email to the reviewee
    try {
      const [recipient] = await db
        .select({ name: users.name, preferredName: users.preferredName, email: users.email })
        .from(users)
        .where(eq(users.id, review.userId))
        .limit(1);

      const [actor] = await db
        .select({ name: users.name, preferredName: users.preferredName })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (recipient && actor) {
        const recipientName = recipient.preferredName || recipient.name;
        const actorName = actor.preferredName || actor.name;
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        await createNotification({
          userId: review.userId,
          type: "review_completed",
          title: `${actorName} marked your review complete`,
          link: `/reviews/${reviewId}`,
          metadata: { reviewId, actorId: session.user.id },
        });

        if (await shouldEmail(review.userId, "review_completed")) {
          await sendEmail({
            to: recipient.email,
            subject: `Review completed by ${actorName}`,
            html: emailTemplates.reviewCompleted(recipientName, actorName, appUrl),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Failed to send review_completed notifications:", notifyErr);
    }
```

Add the same imports (`users`, `createNotification`, `shouldEmail`, `sendEmail`, `emailTemplates`).

- [ ] **Step 4: Update tests**

In each of the three corresponding `.test.ts` files, add the same shared mocks used in Task 11 (mocking `inAppNotifications`, `emailPreferences`, `email`) and add one assertion per file:

- `index.patch.test.ts`: assert `createNotification` was called with `type: "review_rescheduled"` when a test case changes `scheduledDate`, and NOT called when it doesn't change.
- `index.delete.test.ts`: assert `createNotification` was called with `type: "review_cancelled"`.
- `complete.patch.test.ts`: assert `createNotification` was called with `type: "review_completed"`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run server/api/reviews`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add server/api/reviews
git commit -m "feat(reviews): emit notifications + emails on reschedule/cancel/complete"
```

---

### Task 13: Emit review_reminder in-app notification from cron

**Files:**
- Modify: `server/tasks/review-reminders.ts`

- [ ] **Step 1: Add in-app emission inside sendReminders**

In `server/tasks/review-reminders.ts`, add at the top:

```ts
import { createNotification } from "#server/utils/inAppNotifications";
import { shouldEmail } from "#server/utils/emailPreferences";
```

Replace the existing `if (reviewee.emailNotifications !== false) { ... }` block with:

```ts
  // Always emit in-app notification for the reviewee
  await createNotification({
    userId: reviewee.id,
    type: "review_reminder",
    title: `Review with ${buddy.name} in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
    body: reviewDate,
    link: `/reviews/${review.id}`,
    metadata: { reviewId: review.id, daysUntil },
  });

  if (await shouldEmail(reviewee.id, "review_reminder")) {
    try {
      await sendEmail({
        to: reviewee.email,
        subject: `Review reminder: upcoming review with ${buddy.name}`,
        html: emailTemplates.reviewReminder(reviewee.name, buddy.name, reviewDate, daysUntil, appUrl),
      });
      sent++;
    } catch (error) {
      console.error(`[review-reminders] Failed to email reviewee ${reviewee.email}:`, error);
    }
  }
```

Apply the same pattern to the buddy block:

```ts
  await createNotification({
    userId: buddy.id,
    type: "review_reminder",
    title: `Review with ${reviewee.name} in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
    body: reviewDate,
    link: `/reviews/${review.id}`,
    metadata: { reviewId: review.id, daysUntil },
  });

  if (await shouldEmail(buddy.id, "review_reminder")) {
    try {
      await sendEmail({
        to: buddy.email,
        subject: `Review reminder: upcoming review with ${reviewee.name}`,
        html: emailTemplates.reviewReminderBuddy(buddy.name, reviewee.name, reviewDate, daysUntil, appUrl),
      });
      sent++;
    } catch (error) {
      console.error(`[review-reminders] Failed to email buddy ${buddy.email}:`, error);
    }
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/tasks/review-reminders.ts
git commit -m "feat(reviews): emit in-app review_reminder alongside emails"
```

---

### Task 14: Goal reminders cron task (TDD)

**Files:**
- Create: `server/tasks/goal-reminders.ts`
- Create: `server/__tests__/goal-reminders.test.ts`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/goal-reminders.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "./helpers/mock-db";

const { mockDb, mockSelect } = createMockDb();

vi.mock("#server/database/connection", () => ({ db: mockDb }));

const createNotification = vi.fn().mockResolvedValue(undefined);
vi.mock("#server/utils/inAppNotifications", () => ({ createNotification }));

const { default: task } = await import("#server/tasks/goal-reminders");

const today = new Date("2026-05-08T09:00:00Z");
const fmt = (d: Date) => d.toISOString().slice(0, 10);

describe("goal-reminders task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  it("emits goal_approaching when target_date is exactly 7 days away", async () => {
    const sevenOut = new Date(today);
    sevenOut.setDate(sevenOut.getDate() + 7);

    // 1st select: goals 7 days out (active)
    // 2nd select: goals overdue (active)
    // 3rd select: existing overdue notifications (per goal)
    mockSelect([{ id: "g1", userId: "u1", goalText: "Ship feature", targetDate: fmt(sevenOut) }]);
    mockSelect([]); // overdue list
    await task.run();

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal_approaching", userId: "u1" }),
    );
  });

  it("emits goal_overdue once per goal even if cron runs again", async () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    mockSelect([]); // approaching
    mockSelect([{ id: "g1", userId: "u1", goalText: "Ship", targetDate: fmt(yesterday) }]);
    mockSelect([]); // no existing overdue notifications

    await task.run();
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal_overdue", userId: "u1" }),
    );

    // Second run: existing overdue notification suppresses
    createNotification.mockClear();
    mockSelect([]); // approaching
    mockSelect([{ id: "g1", userId: "u1", goalText: "Ship", targetDate: fmt(yesterday) }]);
    mockSelect([{ goalId: "g1" }]); // existing overdue notif

    await task.run();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/__tests__/goal-reminders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/tasks/goal-reminders.ts`:

```ts
import { db } from "#server/database/connection";
import { goals, notifications } from "#server/database/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { createNotification } from "#server/utils/inAppNotifications";

export default defineTask({
  meta: {
    name: "goal-reminders",
    description: "Emit goal_approaching and goal_overdue notifications",
  },
  async run() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysOut = new Date(today);
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const sevenStr = sevenDaysOut.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      // 1. Approaching: target_date = today + 7
      const approaching = await db
        .select({ id: goals.id, userId: goals.userId, goalText: goals.goalText, targetDate: goals.targetDate })
        .from(goals)
        .where(and(eq(goals.status, "active"), eq(goals.targetDate, sevenStr)));

      for (const g of approaching) {
        await createNotification({
          userId: g.userId,
          type: "goal_approaching",
          title: "Goal target date in 7 days",
          body: g.goalText,
          link: `/goals/${g.id}`,
          metadata: { goalId: g.id },
        });
      }

      // 2. Overdue: target_date < today, suppress duplicates per goal
      const overdueGoals = await db
        .select({ id: goals.id, userId: goals.userId, goalText: goals.goalText, targetDate: goals.targetDate })
        .from(goals)
        .where(and(eq(goals.status, "active"), lt(goals.targetDate, todayStr)));

      // Look up which already have an overdue notification
      const existingOverdue = await db
        .select({ goalId: sql<string>`metadata->>'goalId'` })
        .from(notifications)
        .where(eq(notifications.type, "goal_overdue"));

      const seen = new Set(existingOverdue.map((r) => r.goalId));

      for (const g of overdueGoals) {
        if (seen.has(g.id)) continue;
        await createNotification({
          userId: g.userId,
          type: "goal_overdue",
          title: "Goal is overdue",
          body: g.goalText,
          link: `/goals/${g.id}`,
          metadata: { goalId: g.id },
        });
      }

      return {
        result: `Emitted ${approaching.length} approaching + ${overdueGoals.filter((g) => !seen.has(g.id)).length} overdue`,
      };
    } catch (error) {
      console.error("[goal-reminders] Task failed:", error);
      return { result: `Task failed: ${error}` };
    }
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/__tests__/goal-reminders.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Register the cron schedule**

In `nuxt.config.ts`, in the `nitro.scheduledTasks` block, change:

```ts
scheduledTasks: {
  "0 9 * * *": ["review-reminders"],
},
```

to:

```ts
scheduledTasks: {
  "0 9 * * *": ["review-reminders", "goal-reminders"],
},
```

- [ ] **Step 6: Commit**

```bash
git add server/tasks/goal-reminders.ts server/__tests__/goal-reminders.test.ts nuxt.config.ts
git commit -m "feat(notifications): add goal-reminders cron"
```

---

## Phase 4 — Client UI

### Task 15: useNotifications composable

**Files:**
- Create: `app/composables/useNotifications.ts`

- [ ] **Step 1: Write the composable**

Create `app/composables/useNotifications.ts`:

```ts
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const _state = reactive({
  unreadCount: 0,
  items: [] as NotificationItem[],
  loaded: false,
});

export const useNotifications = () => {
  const refreshCount = async () => {
    const data = await $fetch<{ count: number }>("/api/notifications/unread-count");
    _state.unreadCount = data.count;
  };

  const fetchPopover = async () => {
    const data = await $fetch<{ items: NotificationItem[]; nextCursor: string | null }>(
      "/api/notifications?limit=10&filter=all",
    );
    _state.items = data.items;
    _state.loaded = true;
  };

  const markRead = async (id: string) => {
    await $fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    const idx = _state.items.findIndex((i) => i.id === id);
    if (idx >= 0 && !_state.items[idx]!.readAt) {
      _state.items[idx]!.readAt = new Date().toISOString();
      _state.unreadCount = Math.max(0, _state.unreadCount - 1);
    }
  };

  const markAllRead = async () => {
    await $fetch("/api/notifications/mark-all-read", { method: "POST" });
    const now = new Date().toISOString();
    _state.items = _state.items.map((i) => (i.readAt ? i : { ...i, readAt: now }));
    _state.unreadCount = 0;
  };

  return {
    unreadCount: computed(() => _state.unreadCount),
    items: computed(() => _state.items),
    loaded: computed(() => _state.loaded),
    refreshCount,
    fetchPopover,
    markRead,
    markAllRead,
  };
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/composables/useNotifications.ts
git commit -m "feat(notifications): add useNotifications composable"
```

---

### Task 16: NotificationsPopover component

**Files:**
- Create: `app/components/NotificationsPopover.vue`

- [ ] **Step 1: Write the component**

Create `app/components/NotificationsPopover.vue`:

```vue
<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

const { items, unreadCount, fetchPopover, markRead, markAllRead } = useNotifications();
const router = useRouter();

const filter = ref<"all" | "unread">("all");

const visible = computed(() =>
  filter.value === "all"
    ? items.value
    : items.value.filter((i) => !i.readAt),
);

onMounted(() => fetchPopover());

const iconFor = (type: string) => {
  if (type.startsWith("feedback_") || type === "buddy_feedback_received") return "i-heroicons-chat-bubble-left-right";
  if (type.startsWith("review_")) return "i-heroicons-calendar-days";
  if (type.startsWith("goal_")) return "i-heroicons-flag";
  return "i-heroicons-bell";
};

const handleClick = async (id: string, link: string) => {
  await markRead(id);
  router.push(link);
};
</script>

<template>
  <div class="w-96 max-w-full">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
      <h3 class="text-lg font-semibold">Notifications</h3>
      <button
        v-if="unreadCount > 0"
        class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        @click="markAllRead"
      >
        Mark all read
      </button>
    </div>
    <div class="flex gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
      <UButton
        size="xs"
        :variant="filter === 'all' ? 'solid' : 'soft'"
        @click="filter = 'all'"
      >All</UButton>
      <UButton
        size="xs"
        :variant="filter === 'unread' ? 'solid' : 'soft'"
        @click="filter = 'unread'"
      >Unread</UButton>
    </div>
    <div class="max-h-96 overflow-y-auto">
      <div
        v-if="visible.length === 0"
        class="p-6 text-center text-sm text-gray-500"
      >
        No notifications
      </div>
      <button
        v-for="n in visible"
        :key="n.id"
        class="w-full text-left flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-900"
        @click="handleClick(n.id, n.link)"
      >
        <UIcon :name="iconFor(n.type)" class="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-500" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium" :class="!n.readAt ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'">
            {{ n.title }}
          </div>
          <div v-if="n.body" class="text-xs text-gray-500 truncate">{{ n.body }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) }}</div>
        </div>
        <span v-if="!n.readAt" class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
      </button>
    </div>
    <div class="p-2 border-t border-gray-200 dark:border-gray-800 text-center">
      <NuxtLink to="/notifications" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
        See all
      </NuxtLink>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/NotificationsPopover.vue
git commit -m "feat(notifications): add NotificationsPopover component"
```

---

### Task 17: Wire bell into sidebar

**Files:**
- Modify: `app/components/SidebarNavigation.vue`
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Add a notifications slot to SidebarNavigation**

In `app/components/SidebarNavigation.vue`, between the Dashboard `<div>` block (ending at line 73) and the Personal section `<div class="space-y-1">` (line 76), insert:

```vue
    <!-- Notifications slot (rendered between Dashboard and Personal) -->
    <div class="space-y-1 mb-2">
      <slot name="notifications" />
    </div>
```

- [ ] **Step 2: Render the bell + popover from the layout**

In `app/layouts/default.vue`, find the line `<SidebarNavigation` (search for it). It is being passed dashboardLink/personalLinks/etc. Above the place that uses it, add this composable usage near the top of `<script setup>`:

```ts
const { unreadCount: notificationsUnread, refreshCount: refreshNotifications } = useNotifications();

if (import.meta.client) {
  refreshNotifications();
  watch(() => route.path, () => refreshNotifications());
}
```

Then wrap the SidebarNavigation invocation with a slot. Find the existing `<SidebarNavigation .../>` (likely self-closing with the props passed) and convert it to:

```vue
<SidebarNavigation ...existing-props...>
  <template #notifications>
    <UPopover :ui="{ content: 'p-0' }">
      <button
        class="w-full flex items-center gap-3 px-4 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        :title="'Notifications'"
      >
        <UIcon name="i-heroicons-bell" class="w-5 h-5 flex-shrink-0" />
        <span class="flex-1 text-left text-sm font-medium">Notifications</span>
        <UBadge
          v-if="notificationsUnread > 0"
          :label="notificationsUnread > 9 ? '9+' : String(notificationsUnread)"
          size="xs"
          color="primary"
        />
      </button>
      <template #content>
        <NotificationsPopover />
      </template>
    </UPopover>
  </template>
</SidebarNavigation>
```

(Keep the existing props and any other slots intact.)

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Open `http://localhost:3000`. Confirm:
- A "Notifications" row with bell icon appears between Dashboard and Personal.
- Clicking it opens the popover (no navigation).
- The popover shows "No notifications" if you have none, otherwise the latest 10.

- [ ] **Step 4: Commit**

```bash
git add app/components/SidebarNavigation.vue app/layouts/default.vue
git commit -m "feat(notifications): wire bell + popover into sidebar"
```

---

### Task 18: /notifications inbox page

**Files:**
- Create: `app/pages/notifications.vue`

- [ ] **Step 1: Write the page**

Create `app/pages/notifications.vue`:

```vue
<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

definePageMeta({ middleware: "auth" });

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const filter = ref<"all" | "unread">("all");
const items = ref<NotificationItem[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const { markRead, markAllRead, refreshCount } = useNotifications();

const load = async (reset = false) => {
  loading.value = true;
  const params = new URLSearchParams({ filter: filter.value, limit: "30" });
  if (!reset && nextCursor.value) params.set("cursor", nextCursor.value);
  const data = await $fetch<{ items: NotificationItem[]; nextCursor: string | null }>(
    `/api/notifications?${params.toString()}`,
  );
  items.value = reset ? data.items : [...items.value, ...data.items];
  nextCursor.value = data.nextCursor;
  loading.value = false;
};

watch(filter, () => {
  nextCursor.value = null;
  load(true);
});

onMounted(() => {
  load(true);
  refreshCount();
});

const iconFor = (type: string) => {
  if (type.startsWith("feedback_") || type === "buddy_feedback_received") return "i-heroicons-chat-bubble-left-right";
  if (type.startsWith("review_")) return "i-heroicons-calendar-days";
  if (type.startsWith("goal_")) return "i-heroicons-flag";
  return "i-heroicons-bell";
};

const handleClick = async (n: NotificationItem) => {
  if (!n.readAt) {
    await markRead(n.id);
    n.readAt = new Date().toISOString();
  }
  router.push(n.link);
};

const handleMarkAll = async () => {
  await markAllRead();
  const now = new Date().toISOString();
  items.value = items.value.map((i) => (i.readAt ? i : { ...i, readAt: now }));
};
</script>

<template>
  <UDashboardPanel id="notifications-page">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2 max-w-3xl">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold">Notifications</h1>
          <UButton variant="soft" size="sm" @click="handleMarkAll">Mark all read</UButton>
        </div>

        <div class="flex gap-2 mb-4">
          <UButton size="xs" :variant="filter === 'all' ? 'solid' : 'soft'" @click="filter = 'all'">All</UButton>
          <UButton size="xs" :variant="filter === 'unread' ? 'solid' : 'soft'" @click="filter = 'unread'">Unread</UButton>
        </div>

        <div v-if="items.length === 0 && !loading" class="text-center py-12 text-gray-500">
          You're all caught up.
        </div>

        <div class="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <button
            v-for="n in items"
            :key="n.id"
            class="w-full text-left flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="handleClick(n)"
          >
            <UIcon :name="iconFor(n.type)" class="w-5 h-5 mt-0.5 text-gray-500 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium" :class="!n.readAt ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'">
                {{ n.title }}
              </div>
              <div v-if="n.body" class="text-xs text-gray-500">{{ n.body }}</div>
              <div class="text-xs text-gray-400 mt-1">{{ formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) }}</div>
            </div>
            <span v-if="!n.readAt" class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
          </button>
        </div>

        <div v-if="nextCursor" class="text-center mt-4">
          <UButton variant="soft" :loading="loading" @click="load(false)">Load more</UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`. Visit `/notifications`. Confirm: page renders, "All"/"Unread" tabs filter, "Mark all read" works, "Load more" appears when there are more than 30 items.

- [ ] **Step 3: Commit**

```bash
git add app/pages/notifications.vue
git commit -m "feat(notifications): add /notifications inbox page"
```

---

### Task 19: Settings page restructure

**Files:**
- Modify: `app/pages/settings/notifications.vue`
- Create: `server/api/user/notification-preferences.patch.ts` (+ test)

- [ ] **Step 1: Add API to update preferences**

Create `server/api/user/notification-preferences.patch.ts`:

```ts
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateBody, validateResponse } from "#server/utils/validation";

const BodySchema = z.object({
  preferences: z.record(z.string(), z.boolean()),
});

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  const { preferences } = await validateBody(event, BodySchema);

  await db
    .update(users)
    .set({ emailNotificationPreferences: preferences })
    .where(eq(users.id, session.user.id));

  return validateResponse({ success: true }, z.object({ success: z.literal(true) }));
});
```

Create a matching test `server/api/user/notification-preferences.patch.test.ts` covering 401, valid update, and invalid body (400). Use the same patterns as other API tests in the repo.

- [ ] **Step 2: Update the settings page**

Open `app/pages/settings/notifications.vue` and replace the contents below the existing tab-strip (i.e. the body of the page after the Settings nav tabs) with a category table. Keep the tab strip intact.

Replace the existing UCard body (the "Email Notifications" toggle) with:

```vue
<UCard>
  <template #header>
    <h2 class="text-lg font-medium">Notification preferences</h2>
    <p class="text-sm text-gray-500 mt-1">
      In-app notifications are always on. Toggle which categories also send email.
    </p>
  </template>

  <div class="space-y-2">
    <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-2 py-1 text-xs uppercase tracking-wide text-gray-500">
      <span>Category</span>
      <span class="w-16 text-center">In-app</span>
      <span class="w-16 text-center">Email</span>
    </div>
    <div
      v-for="cat in categories"
      :key="cat.key"
      class="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-2 py-2 border-t border-gray-100 dark:border-gray-800"
    >
      <div>
        <div class="text-sm font-medium">{{ cat.label }}</div>
        <div class="text-xs text-gray-500">{{ cat.description }}</div>
      </div>
      <div class="w-16 flex justify-center">
        <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-gray-400" />
      </div>
      <div class="w-16 flex justify-center">
        <UToggle
          v-if="cat.email !== null"
          :model-value="emailEnabled(cat.key)"
          @update:model-value="(v) => setEmail(cat.key, v)"
        />
        <span v-else class="text-gray-400 text-sm">—</span>
      </div>
    </div>
  </div>
</UCard>
```

In the script section, add:

```ts
interface CategoryDef {
  key: string;
  label: string;
  description: string;
  email: boolean | null; // null = email not applicable (goal events)
}

const categories: CategoryDef[] = [
  { key: "feedback_received", label: "Feedback received", description: "When someone publishes feedback for you", email: true },
  { key: "buddy_feedback_received", label: "Feedback for someone you buddy", description: "When feedback is published for someone you support", email: true },
  { key: "review_created", label: "Review scheduled by buddy", description: "When your buddy schedules a new review with you", email: true },
  { key: "review_rescheduled", label: "Review rescheduled", description: "When your buddy moves a scheduled review", email: true },
  { key: "review_cancelled", label: "Review cancelled", description: "When your buddy cancels a scheduled review", email: true },
  { key: "review_completed", label: "Review completed", description: "When your buddy marks a review complete", email: true },
  { key: "review_reminder", label: "Review reminders", description: "7-day and 1-day reminders before scheduled reviews", email: true },
  { key: "goal_approaching", label: "Goal approaching target", description: "7 days before a goal's target date (in-app only)", email: null },
  { key: "goal_overdue", label: "Goal overdue", description: "When a goal passes its target date (in-app only)", email: null },
];

const { data: prefsData, refresh: refreshPrefs } = await useApi<{ preferences: Record<string, boolean> }>(
  "/user/notification-preferences",
  { default: () => ({ preferences: {} }) },
);

const emailEnabled = (key: string) => prefsData.value?.preferences?.[key] !== false;

const setEmail = async (key: string, value: boolean) => {
  const next = { ...(prefsData.value?.preferences ?? {}), [key]: value };
  await $fetch("/api/user/notification-preferences", {
    method: "PATCH",
    body: { preferences: next },
  });
  await refreshPrefs();
};
```

- [ ] **Step 3: Add GET endpoint for preferences**

Create `server/api/user/notification-preferences.get.ts`:

```ts
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  const [row] = await db
    .select({ emailNotificationPreferences: users.emailNotificationPreferences })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return { preferences: row?.emailNotificationPreferences ?? {} };
});
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`. Visit `/settings/notifications`. Confirm:
- Categories rendered as table.
- Toggling email off persists across reload.
- Goal rows show "—" in Email column.

- [ ] **Step 5: Commit**

```bash
git add server/api/user/notification-preferences.get.ts server/api/user/notification-preferences.patch.ts server/api/user/notification-preferences.patch.test.ts app/pages/settings/notifications.vue
git commit -m "feat(settings): per-category email preferences UI + API"
```

---

## Phase 5 — Verification

### Task 20: Update feedback publish handlers' tests

**Files:**
- Modify: `server/api/feedback/[id]/publish.patch.test.ts`
- Modify: `server/api/feedback/publish-batch.post.test.ts`

- [ ] **Step 1: Re-run feedback tests after the notifications.ts refactor (Task 5)**

Run: `npx vitest run server/api/feedback`

If tests fail because they asserted on the old `emailNotifications` boolean, update those assertions: replace any expectation that the user record has `emailNotifications: true/false` with `emailNotificationPreferences: {}` (default) or `{ feedback_received: false }` (opted out). The intent of the test (does email send / does it not) should be preserved.

If tests fail because new modules (`createNotification`, `shouldEmail`) are imported but not mocked, add at the top:

```ts
vi.mock("#server/utils/inAppNotifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("#server/utils/emailPreferences", () => ({
  shouldEmail: vi.fn().mockResolvedValue(true),
}));
```

- [ ] **Step 2: Add an assertion that publishing emits feedback_received**

In `publish.patch.test.ts` and `publish-batch.post.test.ts`, in a happy-path test, add:

```ts
import { createNotification } from "#server/utils/inAppNotifications";
// ... after invoking the handler:
await new Promise((r) => setTimeout(r, 5100)); // wait past debounce
expect(createNotification).toHaveBeenCalledWith(
  expect.objectContaining({ type: "feedback_received" }),
);
```

If waiting 5+ seconds in a test is undesirable, instead refactor the assertion to inspect `pendingRevieweeIds` immediately by exporting a `__test__` flush helper from `notifications.ts` — OR use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(5100)`.

- [ ] **Step 3: Run all tests**

Run: `npm test -- --run`
Expected: full suite passes.

- [ ] **Step 4: Commit**

```bash
git add server/api/feedback
git commit -m "test(feedback): assert in-app notification emitted on publish"
```

---

### Task 21: End-to-end manual verification

- [ ] **Step 1: Reset and seed local DB**

Run: `npm run db:reset && npm run db:seed`

- [ ] **Step 2: Start dev server**

Run: `npm run dev`

- [ ] **Step 3: Walk through each event type**

Sign in as a seeded user. For each action below, confirm the expected notification appears in the bell popover (refresh route to update count if needed).

| Action (perform via UI) | Expected notification |
|---|---|
| Sign in as a buddy, publish feedback for someone | reviewee sees `feedback_received`; buddy sees `buddy_feedback_received` |
| Sign in as a buddy, schedule a review with someone | reviewee sees `review_created` + email |
| Reschedule the review | reviewee sees `review_rescheduled` + email |
| Cancel/delete the review | reviewee sees `review_cancelled` + email |
| Recreate, then mark complete | reviewee sees `review_completed` + email |

- [ ] **Step 4: Manually trigger crons**

Trigger via Nitro tasks endpoint or by calling the task handler in a script:

```bash
curl -X POST http://localhost:3000/_nitro/tasks/goal-reminders
curl -X POST http://localhost:3000/_nitro/tasks/review-reminders
```

(If `_nitro` is not exposed in dev, modify a goal's `target_date` directly in the DB to today+7 or yesterday, then run `tsx -e "import('./server/tasks/goal-reminders').then(t => t.default.run())"` from the project root.)

Confirm `goal_approaching`, `goal_overdue`, and `review_reminder` notifications appear.

- [ ] **Step 5: Verify settings**

In `/settings/notifications`, toggle off one category's email. Trigger that event again — confirm the in-app notification still arrives but the email does NOT (check Resend dashboard or local SMTP catch).

- [ ] **Step 6: Final commit (if any tweaks needed)**

If verification surfaces issues, fix and commit per area. Otherwise no commit needed.

---

## Self-Review Notes

- Spec coverage: every event type, endpoint, UI element, and settings change in `2026-05-08-notifications-design.md` is mapped to a task.
- Type names are consistent throughout: `NotificationType`, `EmailCategory`, `createNotification`, `shouldEmail`.
- `emailNotificationPreferences` (camelCase in TS, `email_notification_preferences` in SQL) used uniformly.
- The migration includes the backfill so existing users who had `emailNotifications=false` keep that behaviour across all categories.
- `goal_overdue` idempotency is enforced at task-run time by querying existing notifications, not by a unique index — so re-running on the same day is safe.
- Tests use the existing `createMockDb`/`createAuthenticatedEvent` patterns from `server/__tests__/helpers/`.
