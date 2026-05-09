# Dashboard Redesign Phase 2 — New Data & Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Activity Feed, Feedback Pulse chart, and Streak Badge sections to the dashboard, backed by three new/modified API endpoints.

**Architecture:** Three new API endpoints provide data (activity feed, feedback pulse, feedback streak). Three new Vue components consume that data via props drilled from `index.vue`. The Feedback Pulse chart uses Unovis (already installed). All endpoints follow the existing pattern: session auth check, drizzle-orm queries, Zod-validated responses.

**Tech Stack:** Nuxt 4, Nuxt UI, Unovis (`@unovis/vue`), drizzle-orm, Zod, Tailwind CSS (dark mode)

---

## File Structure

### Create
| File | Purpose |
|------|---------|
| `server/api/dashboard/activity.get.ts` | Recent activity feed endpoint (feedback given + received for MVP) |
| `server/api/dashboard/feedback-pulse.get.ts` | 12-week feedback given vs received breakdown |
| `app/components/dashboard/ActivityFeed.vue` | Recent activity list with coloured icons and timestamps |
| `app/components/dashboard/FeedbackPulse.vue` | Unovis area chart — given vs received over 12 weeks |
| `app/components/dashboard/StreakBadge.vue` | Consecutive-week feedback streak display |

### Modify
| File | Change |
|------|--------|
| `server/schemas/api.ts` | Add `GetDashboardActivityResponseSchema`, `GetFeedbackPulseResponseSchema`; extend `GetDashboardStatsResponseSchema` with `feedbackStreak` |
| `server/types/index.ts` | Add new response type exports |
| `server/api/dashboard/stats.get.ts` | Add `feedbackStreak` calculation |
| `app/pages/index.vue` | Fetch new endpoints, add ActivityFeed/FeedbackPulse/StreakBadge to layout |

---

## Task 1: Add Zod Schemas for New Endpoints

**Files:**
- Modify: `server/schemas/api.ts:850-856`
- Modify: `server/types/index.ts`

- [ ] **Step 1: Add the three new schemas to `server/schemas/api.ts`**

Find the existing `GetDashboardStatsResponseSchema` (line 850) and update it + add two new schemas right after it:

```typescript
// Replace the existing GetDashboardStatsResponseSchema with:
export const GetDashboardStatsResponseSchema = z.object({
  feedbackGiven: z.int().nonnegative(),
  feedbackGivenTrend: z.int(),
  feedbackReceived: z.int().nonnegative(),
  feedbackReceivedTrend: z.int(),
  daysUntilReview: z.int().nonnegative().nullable(),
  feedbackStreak: z.int().nonnegative(),
});

// Add after GetDashboardStatsResponseSchema:
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

export const GetFeedbackPulseResponseSchema = z.object({
  weeks: z.array(
    z.object({
      week: z.string(),
      given: z.int().nonnegative(),
      received: z.int().nonnegative(),
    }),
  ),
});
```

- [ ] **Step 2: Add type exports to `server/types/index.ts`**

Add these lines in the `// ===== API RESPONSE TYPES =====` section, after the existing dashboard stats type (there isn't one exported yet, so add near the other response types):

```typescript
export type GetDashboardStatsResponse = z.infer<typeof apiSchemas.GetDashboardStatsResponseSchema>;
export type GetDashboardActivityResponse = z.infer<typeof apiSchemas.GetDashboardActivityResponseSchema>;
export type GetFeedbackPulseResponse = z.infer<typeof apiSchemas.GetFeedbackPulseResponseSchema>;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No errors related to the new schemas.

- [ ] **Step 4: Commit**

```bash
git add server/schemas/api.ts server/types/index.ts
git commit -m "feat(dashboard): add Zod schemas for activity, feedback-pulse, and streak"
```

---

## Task 2: Add `feedbackStreak` to Dashboard Stats Endpoint

**Files:**
- Modify: `server/api/dashboard/stats.get.ts`

The streak is the number of consecutive weeks (going backwards from the current week) where the user submitted at least one piece of feedback. Week boundaries use the same Sunday-start convention already in this file.

- [ ] **Step 1: Add streak calculation to `server/api/dashboard/stats.get.ts`**

Add this code after the `daysUntilReview` calculation (after line 129) and before the `return validateResponse(...)` call:

```typescript
    // Calculate feedback streak (consecutive weeks with at least 1 feedback given)
    let feedbackStreak = 0;
    const weekCursor = new Date(startOfThisWeek);

    // Check current week first — only count it if there's feedback
    if (feedbackGivenCount > 0) {
      feedbackStreak = 1;
      weekCursor.setDate(weekCursor.getDate() - 7);

      // Walk backwards through previous weeks
      let keepChecking = true;
      while (keepChecking) {
        const weekEnd = new Date(weekCursor);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(feedback)
          .where(
            and(
              eq(feedback.reviewerId, session.user.id),
              gte(feedback.createdAt, weekCursor),
              lt(feedback.createdAt, weekEnd)
            )
          );

        if (result.count > 0) {
          feedbackStreak++;
          weekCursor.setDate(weekCursor.getDate() - 7);
        } else {
          keepChecking = false;
        }
      }
    }
```

Then update the return statement to include `feedbackStreak`:

```typescript
    return validateResponse(
      {
        feedbackGiven: feedbackGivenCount,
        feedbackGivenTrend,
        feedbackReceived: feedbackReceivedCount,
        feedbackReceivedTrend,
        daysUntilReview,
        feedbackStreak,
      },
      apiSchemas.GetDashboardStatsResponseSchema
    );
```

Add `sql` to the imports from `drizzle-orm` (it's not imported yet in this file):

```typescript
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";
```

- [ ] **Step 2: Verify the server starts without errors**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add server/api/dashboard/stats.get.ts
git commit -m "feat(dashboard): add feedbackStreak to stats endpoint"
```

---

## Task 3: Build Activity Feed Endpoint

**Files:**
- Create: `server/api/dashboard/activity.get.ts`

For MVP, this returns the user's recent feedback (given and received), merged into a single sorted list. Other event types (goals, achievements, reviews) are deferred to a later phase.

- [ ] **Step 1: Create `server/api/dashboard/activity.get.ts`**

```typescript
import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

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

    // Feedback received (published only)
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
        and(
          eq(feedback.revieweeId, userId),
          eq(feedback.published, true)
        )
      )
      .orderBy(desc(feedback.publishedAt))
      .limit(10);

    // Feedback given
    const given = await db
      .select({
        id: feedback.id,
        personName: users.name,
        isRead: feedback.isRead,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.revieweeId, users.id))
      .where(eq(feedback.reviewerId, userId))
      .orderBy(desc(feedback.createdAt))
      .limit(10);

    // Merge and sort by date descending
    const activities = [
      ...received.map((r) => ({
        id: r.id,
        type: "feedback_received" as const,
        description: `You received feedback from ${r.personName}`,
        personName: r.personName,
        isRead: r.isRead,
        createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
      ...given.map((g) => ({
        id: g.id,
        type: "feedback_given" as const,
        description: `You submitted feedback for ${g.personName}`,
        personName: g.personName,
        isRead: null,
        createdAt: g.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return validateResponse(
      { activities },
      apiSchemas.GetDashboardActivityResponseSchema
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

- [ ] **Step 2: Verify the server starts without errors**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add server/api/dashboard/activity.get.ts
git commit -m "feat(dashboard): add activity feed endpoint (feedback-only MVP)"
```

---

## Task 4: Build Feedback Pulse Endpoint

**Files:**
- Create: `server/api/dashboard/feedback-pulse.get.ts`

Returns 12 weeks of data: how many feedback items the user gave and received each week. Follows the same ISO week calculation pattern used in `server/api/admin/engagement.get.ts`.

- [ ] **Step 1: Create `server/api/dashboard/feedback-pulse.get.ts`**

```typescript
import { db } from "../../database/connection";
import { feedback } from "../../database/schema";
import { eq, and, sql } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

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

    // Build last 12 weeks list
    const now = new Date();
    const weekLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      weekLabels.push(getISOWeek(date));
    }

    // Feedback given per week (uses weekYear column)
    const givenByWeek = await db
      .select({
        weekYear: feedback.weekYear,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .where(
        and(
          eq(feedback.reviewerId, userId),
          sql`${feedback.weekYear} IS NOT NULL`
        )
      )
      .groupBy(feedback.weekYear);

    // Feedback received per week (published only, use publishedAt)
    // weekYear is set on the reviewer's submission, not the receiver — so we
    // derive the week from publishedAt for received feedback.
    const receivedByWeek = await db
      .select({
        weekYear: sql<string>`to_char(${feedback.publishedAt}, 'IYYY-"W"IW')`,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, userId),
          eq(feedback.published, true),
          sql`${feedback.publishedAt} IS NOT NULL`
        )
      )
      .groupBy(sql`to_char(${feedback.publishedAt}, 'IYYY-"W"IW')`);

    // Build maps
    const givenMap = new Map<string, number>();
    givenByWeek.forEach((row) => {
      if (row.weekYear) givenMap.set(row.weekYear, row.count);
    });

    const receivedMap = new Map<string, number>();
    receivedByWeek.forEach((row) => {
      if (row.weekYear) receivedMap.set(row.weekYear, row.count);
    });

    // Assemble response
    const weeks = weekLabels.map((week) => ({
      week,
      given: givenMap.get(week) ?? 0,
      received: receivedMap.get(week) ?? 0,
    }));

    return validateResponse(
      { weeks },
      apiSchemas.GetFeedbackPulseResponseSchema
    );
  } catch (error) {
    console.error("Error fetching feedback pulse:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback pulse",
    });
  }
});
```

- [ ] **Step 2: Verify the server starts without errors**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add server/api/dashboard/feedback-pulse.get.ts
git commit -m "feat(dashboard): add feedback-pulse endpoint (12-week given/received)"
```

---

## Task 5: Build ActivityFeed Component

**Files:**
- Create: `app/components/dashboard/ActivityFeed.vue`

Displays a list of recent activity items with coloured icons and relative timestamps. Matches the card style of `GoalProgress.vue` (UCard, bg-gray-900/50, border-gray-800).

- [ ] **Step 1: Create `app/components/dashboard/ActivityFeed.vue`**

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
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-start gap-3"
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
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Activity {
  id: string
  type: 'feedback_received' | 'feedback_given'
  description: string
  personName: string
  isRead: boolean | null
  createdAt: string
}

interface Props {
  activities: Activity[]
}

defineProps<Props>()

function iconName(type: Activity['type']): string {
  return type === 'feedback_received'
    ? 'i-heroicons-chat-bubble-left-right'
    : 'i-heroicons-paper-airplane'
}

function iconBgClass(type: Activity['type']): string {
  return type === 'feedback_received'
    ? 'bg-teal-900/30'
    : 'bg-blue-900/30'
}

function iconColorClass(type: Activity['type']): string {
  return type === 'feedback_received'
    ? 'text-teal-400'
    : 'text-blue-400'
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

- [ ] **Step 2: Verify the component compiles**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/dashboard/ActivityFeed.vue
git commit -m "feat(dashboard): add ActivityFeed component with relative timestamps"
```

---

## Task 6: Build StreakBadge Component

**Files:**
- Create: `app/components/dashboard/StreakBadge.vue`

Shows a flame icon with the streak count, or a motivational message when the streak is 0. Compact card in the narrow left column.

- [ ] **Step 1: Create `app/components/dashboard/StreakBadge.vue`**

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800 relative overflow-hidden">
    <!-- Amber glow for active streaks -->
    <div
      v-if="streak > 0"
      class="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"
    />

    <div class="relative">
      <div class="flex items-center gap-2 mb-3">
        <UIcon name="i-heroicons-fire" class="text-amber-400 text-sm" />
        <span class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Streak</span>
      </div>

      <!-- Active streak -->
      <template v-if="streak > 0">
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-4xl font-bold text-white tabular-nums leading-none">{{ streak }}</span>
          <span class="text-sm text-gray-400">{{ streak === 1 ? 'week' : 'weeks' }}</span>
        </div>
        <p class="text-[13px] text-gray-400">
          {{ streakMessage }}
        </p>
      </template>

      <!-- No streak -->
      <template v-else>
        <p class="text-[13px] text-gray-400">
          Start your streak — <NuxtLink to="/feedback/give" class="text-amber-400 hover:text-amber-300">submit feedback</NuxtLink> this week.
        </p>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  streak: number
}

const props = defineProps<Props>()

const streakMessage = computed(() => {
  if (props.streak >= 8) return "Incredible consistency! Keep it going."
  if (props.streak >= 4) return "You've given feedback every week this month."
  return "You're building a great habit!"
})
</script>
```

- [ ] **Step 2: Verify the component compiles**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/dashboard/StreakBadge.vue
git commit -m "feat(dashboard): add StreakBadge component with motivational states"
```

---

## Task 7: Build FeedbackPulse Chart Component

**Files:**
- Create: `app/components/dashboard/FeedbackPulse.vue`

Unovis area chart showing feedback given (teal) vs received (purple) over 12 weeks. Follows the pattern in `app/components/admin/EngagementChart.vue` — uses `VisXYContainer`, `VisArea`, `VisLine`, `VisAxis`. Uses `useElementSize` from `@vueuse/core` for responsive width.

- [ ] **Step 1: Create `app/components/dashboard/FeedbackPulse.vue`**

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-white">Feedback Pulse</h3>
      <UIcon name="i-heroicons-chart-bar" class="text-teal-400 text-lg" />
    </div>

    <div v-if="weeks.length === 0" class="text-sm text-gray-500 py-8 text-center">
      Not enough data yet.
    </div>

    <div v-else ref="chartContainer" class="h-48 overflow-visible">
      <VisXYContainer :data="chartData" :height="192" :width="containerWidth" :padding="{ top: 10 }">
        <!-- Given (teal) -->
        <VisArea
          :x="x"
          :y="yGiven"
          color="#2dd4bf"
          :opacity="0.15"
        />
        <VisLine
          :x="x"
          :y="yGiven"
          color="#2dd4bf"
          :line-width="2"
        />

        <!-- Received (purple) -->
        <VisArea
          :x="x"
          :y="yReceived"
          color="#a78bfa"
          :opacity="0.15"
        />
        <VisLine
          :x="x"
          :y="yReceived"
          color="#a78bfa"
          :line-width="2"
        />

        <VisAxis
          type="x"
          :tick-format="formatWeekLabel"
          :num-ticks="6"
        />
        <VisAxis type="y" :tick-format="(d: number) => d.toString()" />
        <VisCrosshair
          color="var(--ui-primary)"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>
    </div>

    <!-- Legend -->
    <div v-if="weeks.length > 0" class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-teal-400" />
        <span class="text-[11px] text-gray-400">Given</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-purple-400" />
        <span class="text-[11px] text-gray-400">Received</span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisAxis, VisTooltip, VisCrosshair } from "@unovis/vue";
import { useElementSize } from "@vueuse/core";

interface WeekData {
  week: string
  given: number
  received: number
}

interface Props {
  weeks: WeekData[]
}

const props = defineProps<Props>()

const chartContainer = useTemplateRef<HTMLElement | null>("chartContainer");
const { width: containerWidth } = useElementSize(chartContainer);

interface ChartDatum {
  index: number
  given: number
  received: number
  week: string
}

const chartData = computed<ChartDatum[]>(() =>
  props.weeks.map((w, index) => ({
    index,
    given: w.given,
    received: w.received,
    week: w.week,
  }))
)

const x = (_: ChartDatum, i: number) => i
const yGiven = (d: ChartDatum) => d.given
const yReceived = (d: ChartDatum) => d.received

const formatWeekLabel = (i: number) => {
  const week = props.weeks[i]?.week
  if (!week) return ""
  // Show abbreviated: "W01", "W05", etc.
  const match = week.match(/W(\d+)/)
  return match ? `W${match[1]}` : week
}

const tooltipTemplate = (d: ChartDatum) => {
  return `
    <div style="padding: 8px; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 4px;">${d.week}</div>
      <div style="color: #2dd4bf;">Given: ${d.given}</div>
      <div style="color: #a78bfa;">Received: ${d.received}</div>
    </div>
  `
}
</script>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
```

- [ ] **Step 2: Verify the component compiles**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/dashboard/FeedbackPulse.vue
git commit -m "feat(dashboard): add FeedbackPulse chart component (Unovis)"
```

---

## Task 8: Wire New Components into Dashboard Page

**Files:**
- Modify: `app/pages/index.vue`

Add three new `useFetch` calls for the new endpoints, and slot the components into the layout following the spec's section order:
- Section 4: ReviewCountdown (left) + ActivityFeed (right) — replaces GoalProgress in the 2-col row when review is scheduled
- Section 5: StreakBadge (left, narrow) + FeedbackPulse (right, wide)
- Section 6: GoalProgress moves down to its own row (full width when no review, or paired with ActivityFeed when review exists)

- [ ] **Step 1: Update the `<script setup>` in `app/pages/index.vue`**

Add three new API fetches after the existing ones (after line 89):

```typescript
const { data: activityData } = await useFetch('/api/dashboard/activity')
const { data: pulseData } = await useFetch('/api/dashboard/feedback-pulse')
```

Add new computed values after the existing ones (after line 110):

```typescript
const feedbackStreak = computed(() => statsData.value?.feedbackStreak ?? 0)

const activities = computed(() => activityData.value?.activities || [])

const pulseWeeks = computed(() => pulseData.value?.weeks || [])
```

- [ ] **Step 2: Update the `<template>` in `app/pages/index.vue`**

Replace the entire content inside `<div ref="container" class="space-y-6">` with the updated layout. The Header, QuickActions, MiniStats, and OnboardingWidget sections stay the same. The rows below change:

```html
          <!-- Header -->
          <div class="animate-item" :style="{ '--delay': '0ms' }">
            <DashboardHeader
              :user-name="user?.preferredName || user?.name?.split(' ')[0] || null"
              :days-until-review="daysUntilReview"
              :buddy-name="nextReviewBuddyName"
              :unread-count="unreadCount"
            />
          </div>

          <!-- Quick Actions -->
          <div class="animate-item" :style="{ '--delay': '100ms' }">
            <DashboardQuickActions />
          </div>

          <!-- Mini Stats -->
          <div class="animate-item" :style="{ '--delay': '150ms' }">
            <DashboardMiniStats
              :unread-count="unreadCount"
              :incoming-count="incomingCount"
              :has-buddies="hasBuddies"
              :active-goals-count="activeGoalsCount"
              :total-goals-count="allGoals.length"
              :days-until-review="daysUntilReview"
            />
          </div>

          <!-- Onboarding Widget (existing, kept for new users) -->
          <div v-if="showOnboarding" class="animate-item flex justify-center" :style="{ '--delay': '200ms' }">
            <OnboardingWidget :is-static="true" />
          </div>

          <!-- Primary Row: Review Countdown + Activity Feed -->
          <div
            v-if="daysUntilReview !== null"
            class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <DashboardReviewCountdown
              :days-until-review="daysUntilReview"
              :review-date="nextReviewDate"
              :buddy-name="nextReviewBuddyName"
              :unread-count="unreadCount"
              :goals="allGoals"
              :achievements-count="achievementsCount"
            />
            <DashboardActivityFeed :activities="activities" />
          </div>

          <!-- If no review, Activity Feed full width -->
          <div
            v-else
            class="animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <DashboardActivityFeed :activities="activities" />
          </div>

          <!-- Secondary Row: Streak Badge (narrow) + Feedback Pulse (wide) -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-item"
            :style="{ '--delay': '300ms' }"
          >
            <DashboardStreakBadge :streak="feedbackStreak" />
            <div class="md:col-span-2">
              <DashboardFeedbackPulse :weeks="pulseWeeks" />
            </div>
          </div>

          <!-- Tertiary Row: Goals Progress -->
          <div class="animate-item" :style="{ '--delay': '350ms' }">
            <DashboardGoalProgress :goals="allGoals" />
          </div>
```

- [ ] **Step 3: Verify the full page compiles and no type errors exist**

Run: `cd /Users/alexbates/repos/work/trellis && npx nuxi typecheck 2>&1 | tail -5`
Expected: No type errors.

- [ ] **Step 4: Start the dev server and visually verify the dashboard loads**

Run: `npm run dev` and visit `http://localhost:3000`. Verify:
- Header, Quick Actions, Mini Stats still render correctly
- Activity Feed shows (may be empty if no feedback data exists)
- Streak Badge shows (0 streak with motivational message, or a streak count)
- Feedback Pulse chart renders (may be flat if no data)
- Goal Progress appears below the chart row
- Layout is responsive (resize browser to check mobile stack)

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat(dashboard): wire ActivityFeed, FeedbackPulse, and StreakBadge into layout"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Zod schemas + types | `server/schemas/api.ts`, `server/types/index.ts` |
| 2 | `feedbackStreak` in stats endpoint | `server/api/dashboard/stats.get.ts` |
| 3 | Activity feed endpoint | `server/api/dashboard/activity.get.ts` |
| 4 | Feedback pulse endpoint | `server/api/dashboard/feedback-pulse.get.ts` |
| 5 | ActivityFeed component | `app/components/dashboard/ActivityFeed.vue` |
| 6 | StreakBadge component | `app/components/dashboard/StreakBadge.vue` |
| 7 | FeedbackPulse chart | `app/components/dashboard/FeedbackPulse.vue` |
| 8 | Wire into index.vue | `app/pages/index.vue` |

## What's NOT in Phase 2 (deferred)

- Activity feed event types beyond feedback (goal milestones, achievements, reviews) — needs richer unified query
- Feedback Themes component — Phase 4, uses existing `/api/insights/user-summary`
- Buddy Section (buddee cards, nudge bar) — Phase 3, needs `GET /api/buddies/dashboard-summary`
