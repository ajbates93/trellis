# Dashboard: Buddy Deep Links & Full Recent Activity Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable deep-linking to a specific buddy's zone pages via `?buddy=<uuid>`, and expand the dashboard Recent Activity feed to cover all six spec'd event types.

**Architecture:** Two independent features in the same branch. Feature 1 is a surgical change inside `useSelectedBuddy` composable plus one call-site update. Feature 2 extends the existing `/api/dashboard/activity` endpoint (currently feedback-only) to aggregate four additional source tables (`goalMilestones`, `achievements`, `feedback` for buddies, `reviewSchedules`), updates the Zod response schema, and broadens `ActivityFeed.vue` to render all types with optional deep links.

**Tech Stack:** Nuxt 4, Vue 3 composables, Drizzle ORM, Zod, Vitest with mock db helper.

**Spec:** `docs/superpowers/specs/2026-04-11-dashboard-buddy-deeplinks-and-activity-feed-design.md`

---

## File Structure

### Feature 1 — Buddy deep links

| Path | Action | Responsibility |
|---|---|---|
| `app/composables/useSelectedBuddy.ts` | Modify | Read + write `?buddy=<uuid>` in URL; validate against loaded buddies; fall back cleanly |
| `app/components/dashboard/BuddeeCard.vue` | Modify (1 line) | Append `?buddy=${buddee.id}` to "Review & publish" link |

### Feature 2 — Full Recent Activity feed

| Path | Action | Responsibility |
|---|---|---|
| `server/schemas/api.ts` | Modify | Widen `GetDashboardActivityResponseSchema` to new 6-type enum + `href` field |
| `server/api/dashboard/activity.get.ts` | Modify | Aggregate feedback, milestones, achievements, buddy feedback, reviews into one unified feed |
| `server/api/dashboard/activity.get.test.ts` | Create | Unit tests for aggregation, templates, sort order, limits |
| `app/components/dashboard/ActivityFeed.vue` | Modify | Widen type union, render all 6 icons/colours, wrap rows in `NuxtLink` when `href` present |
| `app/pages/index.vue` | No change expected | Already uses `useFetch('/api/dashboard/activity')` and passes `activities` prop |

---

## Part A: Buddy Deep Links

### Task 1: Update `useSelectedBuddy` to hydrate from and sync to URL

**Files:**
- Modify: `app/composables/useSelectedBuddy.ts` (full rewrite — file is small)

**Background for the engineer:**
- This composable is used by `app/pages/buddies/feedback.vue`, `goals.vue`, `reviews.vue`.
- It currently stores `selectedBuddyId` in `useState` (Nuxt global-state singleton) and auto-selects the first buddy on initial load.
- `useBuddies()` (already imported) exposes `buddies`, `pending`, and `getBuddyById(id)`.
- Nuxt's `useRoute()` and `useRouter()` work in both SSR and client; `router.replace()` is safe to call on the client only.
- We only want URL-sync behaviour on `/buddies/*` routes — this composable *could* be used elsewhere in future and we shouldn't clobber unrelated URLs.

- [ ] **Step 1: Replace the composable with the URL-aware version**

Replace the entire contents of `app/composables/useSelectedBuddy.ts` with:

```typescript
/**
 * Composable for managing selected buddy state across buddy zone pages.
 * Persists in-memory across the session via useState, and syncs two-way
 * with the `?buddy=<uuid>` query parameter on /buddies/* routes so that
 * buddy-zone pages support deep links and refresh-safe bookmarks.
 */
export const useSelectedBuddy = () => {
  const selectedBuddyId = useState<string | null>("selected-buddy-id", () => null);
  const { buddies, pending, getBuddyById } = useBuddies();
  const route = useRoute();
  const router = useRouter();

  const isOnBuddyRoute = () => route.path.startsWith("/buddies/");

  // Hydrate from URL query param when buddies load, or react to query param changes.
  // Falls back to first-buddy auto-select if query param is missing or invalid.
  watch(
    [() => pending.value, () => route.query.buddy, () => buddies.value.length],
    ([isPending, queryBuddyRaw]) => {
      if (isPending) return;
      if (buddies.value.length === 0) return;

      const queryBuddy = typeof queryBuddyRaw === "string" ? queryBuddyRaw : null;

      if (queryBuddy) {
        if (getBuddyById(queryBuddy)) {
          // Valid query param — honour it
          if (selectedBuddyId.value !== queryBuddy) {
            selectedBuddyId.value = queryBuddy;
          }
          return;
        }
        // Invalid query param — strip it (client-only) and fall through to default
        if (import.meta.client && isOnBuddyRoute()) {
          const { buddy: _removed, ...rest } = route.query;
          router.replace({ query: rest });
        }
      }

      // No (valid) query param: auto-select first buddy if nothing selected yet
      if (selectedBuddyId.value === null) {
        selectedBuddyId.value = buddies.value[0].id;
      }
    },
    { immediate: true },
  );

  // Two-way sync: when selection changes (e.g. user picks from BuddySelector),
  // reflect the new id in the URL so refresh/bookmark stays correct.
  watch(selectedBuddyId, (newId) => {
    if (!import.meta.client) return;
    if (!newId) return;
    if (!isOnBuddyRoute()) return;
    if (route.query.buddy === newId) return;
    router.replace({ query: { ...route.query, buddy: newId } });
  });

  return { selectedBuddyId };
};
```

- [ ] **Step 2: Type-check**

Run: `npx nuxt typecheck`
Expected: No new type errors relating to `useSelectedBuddy.ts`. (The repo may have pre-existing errors; compare against `main` if unsure.)

If typecheck is too slow or noisy, run the dev server instead and watch the terminal for errors.

- [ ] **Step 3: Manual verification — fresh load with valid query param**

Start dev server: `npm run dev`

1. Log in, navigate to `/buddies/feedback?buddy=<a-real-buddy-uuid>` (copy a UUID from your buddies list — check `/api/users/my-buddies` in the network tab if needed).
2. Confirm `BuddySelector` shows that buddy and the feedback list matches.
3. Open a fresh tab to the same URL — same result.

- [ ] **Step 4: Manual verification — invalid query param**

1. Visit `/buddies/feedback?buddy=not-a-real-id`
2. Confirm URL gets rewritten to `/buddies/feedback` (no query param) shortly after load.
3. Confirm it auto-selects the first buddy.

- [ ] **Step 5: Manual verification — two-way sync via dropdown**

1. Visit `/buddies/feedback` (no query param).
2. Change buddy via the `BuddySelector` dropdown.
3. Observe URL bar now shows `?buddy=<new-id>`.
4. Hit refresh — same buddy stays selected.
5. Browser back button: confirm it does NOT step through every dropdown change (because we used `router.replace`, not `push`).

- [ ] **Step 6: Manual verification — cross-page state**

1. Visit `/buddies/feedback?buddy=<idA>`.
2. Click through to `/buddies/goals` (or manually navigate).
3. Confirm goals page shows buddy A (same selection carried over via `useState`).
4. Confirm URL on goals page also gains `?buddy=<idA>`.

---

### Task 2: Update `BuddeeCard` to include buddy id in "Review & publish" link

**Files:**
- Modify: `app/components/dashboard/BuddeeCard.vue:41-47`

- [ ] **Step 1: Update the Review & publish link**

Find this block in `BuddeeCard.vue`:

```vue
<NuxtLink
  v-if="buddee.feedbackToPublish > 0"
  to="/buddies/feedback"
  class="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
>
  Review & publish
</NuxtLink>
```

Replace the `to` attribute:

```vue
<NuxtLink
  v-if="buddee.feedbackToPublish > 0"
  :to="`/buddies/feedback?buddy=${buddee.id}`"
  class="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
>
  Review & publish
</NuxtLink>
```

Note the colon before `to` — it's now a dynamic binding.

Leave the "View profile" `NuxtLink` untouched — it already points at `/buddies/${buddee.id}` (the profile page), which is the correct target.

- [ ] **Step 2: Manual verification**

1. Reload the dashboard.
2. Find a buddee card with pending feedback ("Review & publish" button visible).
3. Click it.
4. Confirm destination is `/buddies/feedback?buddy=<that-buddee-id>` and that the correct buddy is pre-selected.

---

### Task 3: Commit Part A

- [ ] **Step 1: Run lint and tests to confirm no regressions**

```bash
npm run lint
npm test -- --run
```

Expected: lint clean, all tests pass. If tests for `useSelectedBuddy` are absent (they are — no composable tests exist in this repo), that's expected.

- [ ] **Step 2: Commit**

```bash
git add app/composables/useSelectedBuddy.ts app/components/dashboard/BuddeeCard.vue
git commit -m "feat(dashboard): deep-link buddy zone pages via ?buddy query param"
```

---

## Part B: Full Recent Activity Feed

### Task 4: Widen the Zod response schema

**Files:**
- Modify: `server/schemas/api.ts:859-870`

**Background:** The existing `GetDashboardActivityResponseSchema` only permits two enum values and has `personName` as a required field. We're switching to server-templated descriptions, adding `href`, and dropping `personName` (no longer needed — it was only used client-side to build description strings, which now happen on the server).

- [ ] **Step 1: Replace the schema**

Find this block (around line 859):

```typescript
export const GetDashboardActivityResponseSchema = z.object({
  activities: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["feedback_received", "feedback_given"]),
      description: z.string(),
      personName: z.string(),
      isRead: z.boolean().nullable(),
      createdAt: z.string(),
    }),
  ),
});
```

Replace with:

```typescript
export const GetDashboardActivityResponseSchema = z.object({
  activities: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        "feedback_received",
        "feedback_given",
        "goal_milestone",
        "brag_bucket",
        "buddy_feedback",
        "review_completed",
      ]),
      description: z.string(),
      href: z.string().nullable(),
      isRead: z.boolean().nullable(),
      createdAt: z.string(),
    }),
  ),
});
```

- [ ] **Step 2: Type-check**

Run: `npx nuxt typecheck`

Expected: one type error in `server/api/dashboard/activity.get.ts` because the current handler still produces `personName` and lacks `href`. That's fine — we'll fix it in Task 6. If there are errors anywhere *else*, stop and investigate.

---

### Task 5: Create failing test for the extended activity endpoint

**Files:**
- Create: `server/api/dashboard/activity.get.test.ts`

**Background:** Follow the pattern in `server/api/dashboard/stats.get.test.ts`. Tests use `createMockDb` + `mockSelect` helpers that queue up successive `db.select` calls in the order the handler makes them. We'll write ONE test that seeds one row per event type, plus auxiliary tests for auth, sort order, limit, and errors.

**Critical for the engineer:** The order of `mockSelect` calls MUST match the order of `db.select()` calls inside the handler. When you're writing Task 6, the aggregation queries should run in this fixed order:

1. Current user's buddies list (for `buddy_feedback` aggregation — needs a join filter). Skip if the query is structured differently; see Task 6 notes.
2. Feedback received (published)
3. Feedback given
4. Goal milestones (completed)
5. Achievements (brag bucket)
6. Buddy feedback (feedback received by any of the user's buddees)
7. Review schedules (completed)

This order is chosen to keep the test fixture readable. If you reorder in Task 6, update this test correspondingly.

- [ ] **Step 1: Write the test file**

Create `server/api/dashboard/activity.get.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import {
  buildUser,
  buildFeedback,
  buildMilestone,
  buildAchievement,
  buildReviewSchedule,
} from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./activity.get')

describe('GET /api/dashboard/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('aggregates all six event types with templated descriptions', async () => {
    // Queries in order (matches handler):
    // 1. Buddies (users where buddy_id = me)  — needed so we know whose feedback to include as buddy_feedback
    // 2. Feedback received (published)
    // 3. Feedback given
    // 4. Goal milestones (completed)
    // 5. Achievements (brag bucket)
    // 6. Buddy feedback (feedback for any buddee)
    // 7. Review schedules (completed)

    const buddee = buildUser({ id: 'buddee-1', name: 'Matej' })
    const reviewer = { name: 'Alex' }
    const myReceived = [{
      id: 'fb-1',
      personName: reviewer.name,
      isRead: false,
      createdAt: new Date('2026-04-10T10:00:00Z'),
    }]
    const myGiven = [{
      id: 'fb-2',
      personName: 'Marcin',
      createdAt: new Date('2026-04-09T10:00:00Z'),
    }]
    const milestoneRows = [{
      id: 'ms-1',
      title: 'Ship Phase 1',
      completedAt: new Date('2026-04-08T10:00:00Z'),
    }]
    const achievementRows = [{
      id: 'ach-1',
      title: 'Launched dashboard redesign',
      createdAt: new Date('2026-04-07T10:00:00Z'),
    }]
    const buddyFeedbackRows = [{
      id: 'fb-3',
      reviewerName: 'External',
      buddeeId: 'buddee-1',
      buddeeName: 'Matej',
      publishedAt: new Date('2026-04-06T10:00:00Z'),
    }]
    const reviewRows = [{
      id: 'rev-1',
      otherPartyName: 'Marcin',
      completedDate: new Date('2026-04-05T10:00:00Z'),
    }]

    mockSelect([buddee])          // 1. Buddies
    mockSelect(myReceived)        // 2. Feedback received
    mockSelect(myGiven)           // 3. Feedback given
    mockSelect(milestoneRows)     // 4. Milestones
    mockSelect(achievementRows)   // 5. Achievements
    mockSelect(buddyFeedbackRows) // 6. Buddy feedback
    mockSelect(reviewRows)        // 7. Reviews

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toHaveLength(6)

    const byType = Object.fromEntries(
      result.activities.map((a: any) => [a.type, a]),
    )

    expect(byType.feedback_received).toMatchObject({
      description: 'You received feedback from Alex',
      href: '/feedback/inbox',
      isRead: false,
    })
    expect(byType.feedback_given).toMatchObject({
      description: 'You submitted feedback for Marcin',
      href: '/feedback/inbox?tab=given',
      isRead: null,
    })
    expect(byType.goal_milestone).toMatchObject({
      description: 'Milestone completed: "Ship Phase 1"',
      href: '/goals',
    })
    expect(byType.brag_bucket).toMatchObject({
      description: 'You added to your brag bucket: "Launched dashboard redesign"',
      href: '/brag-bucket',
    })
    expect(byType.buddy_feedback).toMatchObject({
      description: 'External submitted feedback for Matej',
      href: '/buddies/feedback?buddy=buddee-1',
    })
    expect(byType.review_completed).toMatchObject({
      description: 'Review with Marcin completed',
      href: '/reviews',
    })
  })

  it('sorts activities by createdAt descending', async () => {
    const older = [{
      id: 'fb-old',
      personName: 'Alex',
      isRead: false,
      createdAt: new Date('2026-03-01T00:00:00Z'),
    }]
    const newer = [{
      id: 'fb-new',
      personName: 'Marcin',
      createdAt: new Date('2026-04-01T00:00:00Z'),
    }]

    mockSelect([])      // 1. Buddies
    mockSelect(older)   // 2. Received
    mockSelect(newer)   // 3. Given
    mockSelect([])      // 4. Milestones
    mockSelect([])      // 5. Achievements
    mockSelect([])      // 6. Buddy feedback
    mockSelect([])      // 7. Reviews

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toHaveLength(2)
    expect(result.activities[0].id).toBe('fb-new')
    expect(result.activities[1].id).toBe('fb-old')
  })

  it('limits result to 15 items by default', async () => {
    // Produce 20 received feedback rows
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `fb-${i}`,
      personName: 'Alex',
      isRead: false,
      createdAt: new Date(2026, 3, i + 1),
    }))

    mockSelect([])    // 1. Buddies
    mockSelect(many)  // 2. Received
    mockSelect([])    // 3. Given
    mockSelect([])    // 4. Milestones
    mockSelect([])    // 5. Achievements
    mockSelect([])    // 6. Buddy feedback
    mockSelect([])    // 7. Reviews

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toHaveLength(15)
  })

  it('returns empty activities array when no data', async () => {
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toEqual([])
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch dashboard activity',
    })
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run server/api/dashboard/activity.get.test.ts`

Expected: Most tests FAIL. The 401 test should still pass (handler already has the auth guard). The aggregation test will fail because the current handler only makes 2 `db.select` calls, not 7, and doesn't template descriptions or return `href`.

This is the red phase of TDD. Move on to Task 6.

---

### Task 6: Rewrite `activity.get.ts` to aggregate all six event types

**Files:**
- Modify: `server/api/dashboard/activity.get.ts` (full rewrite)

**Background:**
- All timestamp columns are nullable in Drizzle schemas, so use `?? new Date()` defensively when converting to ISO strings.
- `achievements.createdAt` is the brag bucket timestamp.
- `goalMilestones.completedAt` is the milestone timestamp; filter on `isCompleted = true` AND `completedAt IS NOT NULL`.
- `reviewSchedules.completedDate` (not `completedAt`) is the review completion timestamp. Filter on `status = 'completed'` AND match user OR buddy.
- For `buddy_feedback`, we need to find users whose `buddyId = currentUser.id` (i.e., people the current user is a buddy TO), then fetch published feedback where `revieweeId` is in that list.
- Use `inArray` from drizzle-orm for the `IN (...)` filter.
- Reviews have two sides — if the current user is the `userId` of the review, the other party is the buddy, and vice versa. The SQL fetches both and the mapping code picks `otherPartyName` accordingly.

- [ ] **Step 1: Replace the handler**

Replace the entire contents of `server/api/dashboard/activity.get.ts` with:

```typescript
import { db } from "../../database/connection";
import {
  feedback,
  users,
  goals,
  goalMilestones,
  achievements,
  reviewSchedules,
} from "../../database/schema";
import { eq, and, desc, inArray, isNotNull, or } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

const DEFAULT_LIMIT = 15;
const PER_SOURCE_LIMIT = 20;

type Activity = {
  id: string;
  type:
    | "feedback_received"
    | "feedback_given"
    | "goal_milestone"
    | "brag_bucket"
    | "buddy_feedback"
    | "review_completed";
  description: string;
  href: string | null;
  isRead: boolean | null;
  createdAt: string;
};

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const userId = session.user.id;

    // 1. Buddees (users for whom the current user is the assigned buddy)
    const buddees = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.buddyId, userId));

    const buddeeIds = buddees.map((b) => b.id);
    const buddeeNameById = new Map(buddees.map((b) => [b.id, b.name]));

    // 2. Feedback received (published)
    const received = await db
      .select({
        id: feedback.id,
        personName: users.name,
        isRead: feedback.isRead,
        createdAt: feedback.publishedAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(eq(feedback.revieweeId, userId), eq(feedback.published, true)),
      )
      .orderBy(desc(feedback.publishedAt))
      .limit(PER_SOURCE_LIMIT);

    // 3. Feedback given
    const given = await db
      .select({
        id: feedback.id,
        personName: users.name,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.revieweeId, users.id))
      .where(eq(feedback.reviewerId, userId))
      .orderBy(desc(feedback.createdAt))
      .limit(PER_SOURCE_LIMIT);

    // 4. Goal milestones (completed, for this user's goals)
    const milestones = await db
      .select({
        id: goalMilestones.id,
        title: goalMilestones.title,
        completedAt: goalMilestones.completedAt,
      })
      .from(goalMilestones)
      .innerJoin(goals, eq(goalMilestones.goalId, goals.id))
      .where(
        and(
          eq(goals.userId, userId),
          eq(goalMilestones.isCompleted, true),
          isNotNull(goalMilestones.completedAt),
        ),
      )
      .orderBy(desc(goalMilestones.completedAt))
      .limit(PER_SOURCE_LIMIT);

    // 5. Brag bucket (achievements) for this user
    const userAchievements = await db
      .select({
        id: achievements.id,
        title: achievements.title,
        createdAt: achievements.createdAt,
      })
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.createdAt))
      .limit(PER_SOURCE_LIMIT);

    // 6. Buddy feedback (feedback received by any of my buddees, published)
    const buddyFeedbackRaw =
      buddeeIds.length > 0
        ? await db
            .select({
              id: feedback.id,
              reviewerName: users.name,
              buddeeId: feedback.revieweeId,
              publishedAt: feedback.publishedAt,
            })
            .from(feedback)
            .innerJoin(users, eq(feedback.reviewerId, users.id))
            .where(
              and(
                inArray(feedback.revieweeId, buddeeIds),
                eq(feedback.published, true),
              ),
            )
            .orderBy(desc(feedback.publishedAt))
            .limit(PER_SOURCE_LIMIT)
        : [];

    // 7. Reviews completed (either side of the relationship)
    const reviews = await db
      .select({
        id: reviewSchedules.id,
        userId: reviewSchedules.userId,
        buddyId: reviewSchedules.buddyId,
        userName: users.name,
        completedDate: reviewSchedules.completedDate,
      })
      .from(reviewSchedules)
      .innerJoin(
        users,
        // join the OTHER party: if current user is the userId, join buddy; else join user
        or(
          and(
            eq(reviewSchedules.userId, userId),
            eq(reviewSchedules.buddyId, users.id),
          ),
          and(
            eq(reviewSchedules.buddyId, userId),
            eq(reviewSchedules.userId, users.id),
          ),
        )!,
      )
      .where(
        and(
          eq(reviewSchedules.status, "completed"),
          or(
            eq(reviewSchedules.userId, userId),
            eq(reviewSchedules.buddyId, userId),
          )!,
        ),
      )
      .orderBy(desc(reviewSchedules.completedDate))
      .limit(PER_SOURCE_LIMIT);

    // Normalise all sources into a single Activity array
    const activities: Activity[] = [
      ...received.map<Activity>((r) => ({
        id: `feedback_received:${r.id}`,
        type: "feedback_received",
        description: `You received feedback from ${r.personName}`,
        href: "/feedback/inbox",
        isRead: r.isRead ?? null,
        createdAt: (r.createdAt ?? new Date()).toISOString(),
      })),
      ...given.map<Activity>((g) => ({
        id: `feedback_given:${g.id}`,
        type: "feedback_given",
        description: `You submitted feedback for ${g.personName}`,
        href: "/feedback/inbox?tab=given",
        isRead: null,
        createdAt: (g.createdAt ?? new Date()).toISOString(),
      })),
      ...milestones.map<Activity>((m) => ({
        id: `goal_milestone:${m.id}`,
        type: "goal_milestone",
        description: `Milestone completed: "${m.title}"`,
        href: "/goals",
        isRead: null,
        createdAt: (m.completedAt ?? new Date()).toISOString(),
      })),
      ...userAchievements.map<Activity>((a) => ({
        id: `brag_bucket:${a.id}`,
        type: "brag_bucket",
        description: `You added to your brag bucket: "${a.title}"`,
        href: "/brag-bucket",
        isRead: null,
        createdAt: (a.createdAt ?? new Date()).toISOString(),
      })),
      ...buddyFeedbackRaw.map<Activity>((b) => ({
        id: `buddy_feedback:${b.id}`,
        type: "buddy_feedback",
        description: `${b.reviewerName} submitted feedback for ${buddeeNameById.get(b.buddeeId) ?? "your buddy"}`,
        href: `/buddies/feedback?buddy=${b.buddeeId}`,
        isRead: null,
        createdAt: (b.publishedAt ?? new Date()).toISOString(),
      })),
      ...reviews.map<Activity>((r) => ({
        id: `review_completed:${r.id}`,
        type: "review_completed",
        description: `Review with ${r.userName} completed`,
        href: "/reviews",
        isRead: null,
        createdAt: (r.completedDate
          ? new Date(r.completedDate)
          : new Date()
        ).toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, DEFAULT_LIMIT);

    return validateResponse(
      { activities },
      apiSchemas.GetDashboardActivityResponseSchema,
    );
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard activity",
    });
  }
});
```

- [ ] **Step 2: Run the tests — expect them to pass**

Run: `npm test -- --run server/api/dashboard/activity.get.test.ts`

Expected: all 6 tests PASS.

If any test fails, the most likely causes:
- Query order in the handler doesn't match the test's `mockSelect` order → reorder one or the other to match.
- `r.createdAt` in mocks is a `Date` object; the handler does `.toISOString()` — this matches.
- The sort test expects `fb-new` first. If `received` is pushed before `given` and they have same `createdAt` there'd be an ordering question, but the test uses different dates, so that's fine.

- [ ] **Step 3: Run the full test suite to catch regressions**

Run: `npm test -- --run`

Expected: full test suite passes, including pre-existing `stats.get.test.ts` which uses the same mock-db pattern.

- [ ] **Step 4: Type-check**

Run: `npx nuxt typecheck`

Expected: no new type errors in `activity.get.ts` or `schemas/api.ts`. The `!` non-null assertions after `or(...)` are needed because `or()` returns `SQL | undefined` when called with zero args, but we know we're passing args — Drizzle's types don't narrow that.

---

### Task 7: Widen `ActivityFeed.vue` to render all six types

**Files:**
- Modify: `app/components/dashboard/ActivityFeed.vue` (full rewrite)

**Background:**
- Dashboard spec §5 specifies icon/colour per type.
- Each activity may now have an optional `href`. When present, wrap the row in a `NuxtLink`; otherwise render as a plain `div`.
- The unread-dot logic only applies to `feedback_received`.

- [ ] **Step 1: Replace the component**

Replace the entire contents of `app/components/dashboard/ActivityFeed.vue` with:

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-white">Recent Activity</h3>
      <NuxtLink to="/feedback/inbox" class="text-xs text-teal-400 font-medium hover:text-teal-300">
        View all &rarr;
      </NuxtLink>
    </div>

    <div v-if="activities.length === 0" class="text-sm text-gray-500 py-4 text-center">
      No activity yet. <NuxtLink to="/feedback/give" class="text-teal-400 hover:text-teal-300">Submit your first feedback</NuxtLink> to get started.
    </div>

    <div v-else class="space-y-3">
      <component
        :is="activity.href ? NuxtLink : 'div'"
        v-for="activity in activities"
        :key="activity.id"
        :to="activity.href || undefined"
        class="flex items-start gap-3"
        :class="activity.href ? 'hover:bg-gray-800/40 -mx-2 px-2 py-1 rounded transition-colors' : ''"
      >
        <!-- Icon -->
        <div
          class="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          :class="iconBgClass(activity.type)"
        >
          <UIcon :name="iconName(activity.type)" class="text-sm" :class="iconColorClass(activity.type)" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <p class="text-[13px] text-gray-300 truncate">{{ activity.description }}</p>
            <span
              v-if="activity.type === 'feedback_received' && activity.isRead === false"
              class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-teal-400"
            />
          </div>
          <p class="text-[11px] text-gray-500 mt-0.5">{{ formatRelativeTime(activity.createdAt) }}</p>
        </div>
      </component>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const NuxtLink = resolveComponent('NuxtLink')

type ActivityType =
  | 'feedback_received'
  | 'feedback_given'
  | 'goal_milestone'
  | 'brag_bucket'
  | 'buddy_feedback'
  | 'review_completed'

interface Activity {
  id: string
  type: ActivityType
  description: string
  href: string | null
  isRead: boolean | null
  createdAt: string
}

interface Props {
  activities: Activity[]
}

defineProps<Props>()

function iconName(type: ActivityType): string {
  switch (type) {
    case 'feedback_received':
      return 'i-heroicons-chat-bubble-left-right'
    case 'feedback_given':
      return 'i-heroicons-paper-airplane'
    case 'goal_milestone':
      return 'i-heroicons-flag'
    case 'brag_bucket':
      return 'i-heroicons-star'
    case 'buddy_feedback':
      return 'i-heroicons-paper-airplane'
    case 'review_completed':
      return 'i-heroicons-calendar-days'
  }
}

function iconBgClass(type: ActivityType): string {
  switch (type) {
    case 'feedback_received':
      return 'bg-teal-900/30'
    case 'feedback_given':
    case 'buddy_feedback':
      return 'bg-blue-900/30'
    case 'goal_milestone':
      return 'bg-purple-900/30'
    case 'brag_bucket':
      return 'bg-amber-900/30'
    case 'review_completed':
      return 'bg-green-900/30'
  }
}

function iconColorClass(type: ActivityType): string {
  switch (type) {
    case 'feedback_received':
      return 'text-teal-400'
    case 'feedback_given':
    case 'buddy_feedback':
      return 'text-blue-400'
    case 'goal_milestone':
      return 'text-purple-400'
    case 'brag_bucket':
      return 'text-amber-400'
    case 'review_completed':
      return 'text-green-400'
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
</script>
```

**Notes on the `<component :is>` pattern:**
- `resolveComponent('NuxtLink')` is the Nuxt-blessed way to get a reference to `NuxtLink` for dynamic binding. If this turns out to be fiddly, a simpler alternative is to write two separate `v-if/v-else` branches — one for linked rows, one for unlinked — duplicating the inner layout. Prefer the dynamic component if it works.
- The `:to="activity.href || undefined"` pattern avoids passing `null` to NuxtLink when we're rendering as a `div`.

- [ ] **Step 2: Typecheck & lint**

```bash
npx nuxt typecheck
npm run lint
```

Expected: clean. If the `<component :is>` pattern produces type errors, fall back to the `v-if/v-else` alternative noted above.

- [ ] **Step 3: Manual verification**

1. Start dev server: `npm run dev`
2. Visit the dashboard.
3. Confirm the Recent Activity feed renders. If your test account has real data for more than one source, confirm multiple event types appear mixed in the same feed.
4. Click a row with an `href` (e.g., a feedback item) — confirm it navigates correctly.
5. Hover over a linked row — confirm the hover background appears.
6. If you can seed some test data (milestone completion, brag bucket add, review completion), do so and verify each type's icon, colour, and description render as spec'd.

If you lack test data: just confirm the existing feedback events render correctly with the new code path, and trust the unit tests for the other types.

---

### Task 8: Commit Part B

- [ ] **Step 1: Final test & lint run**

```bash
npm run lint
npm test -- --run
npx nuxt typecheck
```

Expected: all green.

- [ ] **Step 2: Commit**

```bash
git add \
  server/schemas/api.ts \
  server/api/dashboard/activity.get.ts \
  server/api/dashboard/activity.get.test.ts \
  app/components/dashboard/ActivityFeed.vue
git commit -m "feat(dashboard): expand recent activity feed to all 6 event types"
```

---

## Verification Checklist

After both commits, confirm end-to-end:

- [ ] `/buddies/feedback?buddy=<valid-id>` pre-selects the buddy
- [ ] `/buddies/feedback?buddy=<invalid-id>` strips the param and falls back
- [ ] Changing buddy via dropdown updates URL (replace, not push)
- [ ] Selection persists across buddy-zone page navigation
- [ ] Dashboard `Review & publish` button links with the buddy id
- [ ] Dashboard Recent Activity shows more than just feedback if any non-feedback events exist
- [ ] Clicking activity rows navigates to the correct destination
- [ ] `npm test -- --run` is green
- [ ] `npm run lint` is clean
- [ ] `npx nuxt typecheck` is clean
