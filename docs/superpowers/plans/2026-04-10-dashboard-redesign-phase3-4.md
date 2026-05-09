# Dashboard Redesign Phase 3+4 — Buddy Section & Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the conditional Buddy Section to the dashboard (Phase 3) and the Feedback Themes card plus edge case handling (Phase 4).

**Architecture:** A new `GET /api/buddies/dashboard-summary` endpoint aggregates per-buddee metrics in a single call. Three new Vue components render the buddy section conditionally. The Feedback Themes card fetches from the existing `/api/insights/user-summary` endpoint. All data is fetched at the page level and passed as props.

**Tech Stack:** Nuxt 4, Nuxt UI, drizzle-orm, Zod, Tailwind CSS (dark mode)

---

## File Structure

### Create
| File | Purpose |
|------|---------|
| `server/api/buddies/dashboard-summary.get.ts` | Per-buddee metrics: feedback to publish, received count, active goals, next review, status |
| `app/components/dashboard/BuddySection.vue` | Wrapper: divider, header, nudge bar, buddee card grid |
| `app/components/dashboard/BuddeeCard.vue` | Individual buddee card with metrics and action buttons |
| `app/components/dashboard/FeedbackThemes.vue` | AI insights sentiment bar + theme tags |

### Modify
| File | Change |
|------|--------|
| `server/schemas/api.ts` | Add `GetBuddyDashboardSummaryResponseSchema` |
| `server/types/index.ts` | Add new response type export |
| `app/pages/index.vue` | Add buddy summary + insights fetches, wire BuddySection and FeedbackThemes |

---

## Task 1: Add Zod Schema for Buddy Dashboard Summary

**Files:**
- Modify: `server/schemas/api.ts`
- Modify: `server/types/index.ts`

- [ ] **Step 1: Add schema to `server/schemas/api.ts`**

Add after the `GetFeedbackPulseResponseSchema` (around line 880):

```typescript
export const GetBuddyDashboardSummaryResponseSchema = z.object({
  buddees: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      preferredName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      roleType: z.string().nullable(),
      feedbackToPublish: z.int().nonnegative(),
      feedbackReceived: z.int().nonnegative(),
      activeGoals: z.int().nonnegative(),
      nextReviewDate: z.string().nullable(),
      nextReviewDays: z.int().nullable(),
      status: z.enum(["on_track", "needs_attention", "review_soon"]),
    }),
  ),
  totalFeedbackToPublish: z.int().nonnegative(),
});
```

- [ ] **Step 2: Add type export to `server/types/index.ts`**

Add after the existing dashboard type exports:

```typescript
export type GetBuddyDashboardSummaryResponse = z.infer<typeof apiSchemas.GetBuddyDashboardSummaryResponseSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add server/schemas/api.ts server/types/index.ts
git commit -m "feat(dashboard): add Zod schema for buddy dashboard summary"
```

---

## Task 2: Build Buddy Dashboard Summary Endpoint

**Files:**
- Create: `server/api/buddies/dashboard-summary.get.ts`

Aggregates per-buddee metrics in a single call. For each user where `buddyId = currentUser`:
- Count unpublished feedback (`published = false`)
- Count published feedback received (total, not just recent)
- Count active goals
- Get next scheduled review date
- Derive status: "review_soon" if review within 14 days, "needs_attention" if no feedback received recently, else "on_track"

- [ ] **Step 1: Create `server/api/buddies/dashboard-summary.get.ts`**

```typescript
import { db } from "../../database/connection";
import { users, feedback, goals, reviewSchedules } from "../../database/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
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

    // Find all users where current user is their buddy
    const buddees = await db
      .select({
        id: users.id,
        name: users.name,
        preferredName: users.preferredName,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users)
      .where(eq(users.buddyId, userId));

    if (buddees.length === 0) {
      return validateResponse(
        { buddees: [], totalFeedbackToPublish: 0 },
        apiSchemas.GetBuddyDashboardSummaryResponseSchema
      );
    }

    const now = new Date();
    let totalFeedbackToPublish = 0;

    const buddeesSummary = await Promise.all(
      buddees.map(async (buddee) => {
        // Unpublished feedback for this buddee
        const [unpublished] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(feedback)
          .where(
            and(
              eq(feedback.revieweeId, buddee.id),
              eq(feedback.published, false)
            )
          );

        // Published feedback received (total)
        const [published] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(feedback)
          .where(
            and(
              eq(feedback.revieweeId, buddee.id),
              eq(feedback.published, true)
            )
          );

        // Active goals count
        const [goalsCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(goals)
          .where(
            and(
              eq(goals.userId, buddee.id),
              eq(goals.status, "active")
            )
          );

        // Next scheduled review
        const nextReview = await db
          .select({ scheduledDate: reviewSchedules.scheduledDate })
          .from(reviewSchedules)
          .where(
            and(
              eq(reviewSchedules.userId, buddee.id),
              eq(reviewSchedules.status, "scheduled"),
              gte(reviewSchedules.scheduledDate, now.toISOString().split("T")[0])
            )
          )
          .orderBy(reviewSchedules.scheduledDate)
          .limit(1);

        const feedbackToPublish = unpublished.count;
        totalFeedbackToPublish += feedbackToPublish;

        let nextReviewDate: string | null = null;
        let nextReviewDays: number | null = null;
        if (nextReview.length > 0 && nextReview[0].scheduledDate) {
          const reviewDate = new Date(nextReview[0].scheduledDate);
          nextReviewDate = nextReview[0].scheduledDate;
          nextReviewDays = Math.ceil(
            (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        // Determine status
        let status: "on_track" | "needs_attention" | "review_soon" = "on_track";
        if (nextReviewDays !== null && nextReviewDays <= 14) {
          status = "review_soon";
        } else if (published.count === 0) {
          status = "needs_attention";
        }

        return {
          id: buddee.id,
          name: buddee.name,
          preferredName: buddee.preferredName,
          avatarUrl: buddee.avatarUrl,
          roleType: buddee.roleType,
          feedbackToPublish,
          feedbackReceived: published.count,
          activeGoals: goalsCount.count,
          nextReviewDate,
          nextReviewDays,
          status,
        };
      })
    );

    return validateResponse(
      { buddees: buddeesSummary, totalFeedbackToPublish },
      apiSchemas.GetBuddyDashboardSummaryResponseSchema
    );
  } catch (error) {
    console.error("Error fetching buddy dashboard summary:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy dashboard summary",
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/api/buddies/dashboard-summary.get.ts
git commit -m "feat(dashboard): add buddy dashboard summary endpoint"
```

---

## Task 3: Build BuddeeCard Component

**Files:**
- Create: `app/components/dashboard/BuddeeCard.vue`

Individual card for one buddee with avatar, status badge, metrics row, and action buttons.

- [ ] **Step 1: Create `app/components/dashboard/BuddeeCard.vue`**

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <!-- Header: Avatar + Name + Status -->
    <div class="flex items-center gap-3 mb-3">
      <UAvatar :text="initials" :src="buddee.avatarUrl || undefined" size="sm" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">{{ displayName }}</p>
        <p v-if="buddee.roleType" class="text-[11px] text-gray-500 capitalize">{{ buddee.roleType }}</p>
      </div>
      <UBadge :color="statusColor" variant="subtle" size="xs">
        {{ statusLabel }}
      </UBadge>
    </div>

    <!-- Metrics Row -->
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="bg-gray-800/50 rounded-lg p-2 text-center">
        <p class="text-lg font-semibold tabular-nums" :class="buddee.feedbackToPublish > 0 ? 'text-amber-400' : 'text-white'">
          {{ buddee.feedbackToPublish }}
        </p>
        <p class="text-[10px] text-gray-500">To publish</p>
      </div>
      <div class="bg-gray-800/50 rounded-lg p-2 text-center">
        <p class="text-lg font-semibold text-white tabular-nums">{{ buddee.feedbackReceived }}</p>
        <p class="text-[10px] text-gray-500">Received</p>
      </div>
      <div class="bg-gray-800/50 rounded-lg p-2 text-center">
        <p class="text-lg font-semibold text-white tabular-nums">{{ buddee.activeGoals }}</p>
        <p class="text-[10px] text-gray-500">Goals</p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <UButton
        v-if="buddee.feedbackToPublish > 0"
        to="/buddies/feedback"
        color="purple"
        size="xs"
        class="flex-1"
      >
        Review & publish
      </UButton>
      <UButton
        :to="`/buddies/${buddee.id}`"
        variant="outline"
        size="xs"
        :class="buddee.feedbackToPublish > 0 ? '' : 'flex-1'"
      >
        View profile
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Buddee {
  id: string
  name: string
  preferredName: string | null
  avatarUrl: string | null
  roleType: string | null
  feedbackToPublish: number
  feedbackReceived: number
  activeGoals: number
  nextReviewDate: string | null
  nextReviewDays: number | null
  status: 'on_track' | 'needs_attention' | 'review_soon'
}

interface Props {
  buddee: Buddee
}

const props = defineProps<Props>()

const displayName = computed(() => props.buddee.preferredName || props.buddee.name)

const initials = computed(() => {
  const name = props.buddee.name
  const parts = name.split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2)
})

const statusColor = computed(() => {
  switch (props.buddee.status) {
    case 'review_soon': return 'rose' as const
    case 'needs_attention': return 'amber' as const
    default: return 'teal' as const
  }
})

const statusLabel = computed(() => {
  switch (props.buddee.status) {
    case 'review_soon': return `Review in ${props.buddee.nextReviewDays}d`
    case 'needs_attention': return 'Needs attention'
    default: return 'On track'
  }
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/BuddeeCard.vue
git commit -m "feat(dashboard): add BuddeeCard component with metrics and actions"
```

---

## Task 4: Build BuddySection Component

**Files:**
- Create: `app/components/dashboard/BuddySection.vue`

Wrapper component containing the gradient divider, section header, nudge bar, and buddee card grid.

- [ ] **Step 1: Create `app/components/dashboard/BuddySection.vue`**

```vue
<template>
  <div>
    <!-- Gradient Divider -->
    <div class="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-6" />

    <!-- Section Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-user-group" class="text-purple-400 text-lg" />
        <h2 class="text-[15px] font-semibold text-white">Your Buddees</h2>
        <UBadge color="purple" variant="subtle" size="xs">{{ buddees.length }}</UBadge>
      </div>
      <NuxtLink to="/buddies" class="text-xs text-purple-400 font-medium hover:text-purple-300">
        View all &rarr;
      </NuxtLink>
    </div>

    <!-- Nudge Bar -->
    <div
      v-if="nudgeMessages.length > 0"
      class="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 mb-4 flex items-start gap-2"
    >
      <UIcon name="i-heroicons-exclamation-circle" class="text-purple-400 text-lg flex-shrink-0 mt-0.5" />
      <div class="text-sm text-purple-300">
        <span v-for="(msg, i) in nudgeMessages" :key="i">
          <span v-html="msg" />
          <template v-if="i < nudgeMessages.length - 1"> </template>
        </span>
      </div>
    </div>

    <!-- Buddee Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DashboardBuddeeCard
        v-for="buddee in displayedBuddees"
        :key="buddee.id"
        :buddee="buddee"
      />
    </div>

    <!-- Overflow link -->
    <p v-if="buddees.length > 3" class="text-xs text-gray-500 mt-3 text-center">
      <NuxtLink to="/buddies" class="text-purple-400 hover:text-purple-300">
        +{{ buddees.length - 3 }} more &rarr;
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
interface Buddee {
  id: string
  name: string
  preferredName: string | null
  avatarUrl: string | null
  roleType: string | null
  feedbackToPublish: number
  feedbackReceived: number
  activeGoals: number
  nextReviewDate: string | null
  nextReviewDays: number | null
  status: 'on_track' | 'needs_attention' | 'review_soon'
}

interface Props {
  buddees: Buddee[]
  totalFeedbackToPublish: number
}

const props = defineProps<Props>()

const displayedBuddees = computed(() => props.buddees.slice(0, 3))

const nudgeMessages = computed(() => {
  const messages: string[] = []

  if (props.totalFeedbackToPublish > 0) {
    messages.push(
      `You have <strong>${props.totalFeedbackToPublish} feedback</strong> waiting to be published.`
    )
  }

  const reviewSoonBuddees = props.buddees.filter(b => b.status === 'review_soon')
  for (const b of reviewSoonBuddees) {
    const name = b.preferredName || b.name
    messages.push(
      `<strong>${name}</strong>'s review is in ${b.nextReviewDays} days.`
    )
  }

  return messages
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/BuddySection.vue
git commit -m "feat(dashboard): add BuddySection with nudge bar and buddee cards"
```

---

## Task 5: Build FeedbackThemes Component

**Files:**
- Create: `app/components/dashboard/FeedbackThemes.vue`

Shows AI-generated sentiment breakdown and topic themes. Uses existing `/api/insights/user-summary` endpoint which returns `sentimentData` (positive/constructive/neutral) and `themes` (string array).

- [ ] **Step 1: Create `app/components/dashboard/FeedbackThemes.vue`**

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex items-center gap-2 mb-4">
      <UIcon name="i-heroicons-sparkles" class="text-teal-400 text-lg" />
      <h3 class="text-[15px] font-semibold text-white">Feedback Themes</h3>
    </div>

    <!-- Empty state -->
    <div v-if="!hasAnalysis" class="text-sm text-gray-500 py-4 text-center">
      Not enough feedback for insights yet.
      <NuxtLink to="/insights" class="text-teal-400 hover:text-teal-300">Learn more</NuxtLink>
    </div>

    <template v-else>
      <!-- Sentiment bar -->
      <div v-if="sentiment" class="mb-4">
        <div class="flex h-2 rounded-full overflow-hidden mb-2">
          <div
            class="bg-teal-400"
            :style="{ width: `${sentiment.positive}%` }"
          />
          <div
            class="bg-amber-400"
            :style="{ width: `${sentiment.constructive}%` }"
          />
          <div
            class="bg-gray-600"
            :style="{ width: `${sentiment.neutral}%` }"
          />
        </div>
        <div class="flex justify-between text-[11px] text-gray-500">
          <span>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 mr-1" />
            Positive {{ sentiment.positive }}%
          </span>
          <span>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
            Constructive {{ sentiment.constructive }}%
          </span>
          <span>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-600 mr-1" />
            Neutral {{ sentiment.neutral }}%
          </span>
        </div>
      </div>

      <!-- Theme tags -->
      <div v-if="themes.length > 0" class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="(theme, i) in themes"
          :key="i"
          :color="themeColors[i % themeColors.length]"
          variant="subtle"
          size="xs"
        >
          {{ theme }}
        </UBadge>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface SentimentData {
  positive: number
  constructive: number
  neutral: number
}

interface Props {
  hasAnalysis: boolean
  sentiment: SentimentData | null
  themes: string[]
}

defineProps<Props>()

const themeColors = ['teal', 'purple', 'blue', 'amber', 'green'] as const
</script>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/FeedbackThemes.vue
git commit -m "feat(dashboard): add FeedbackThemes component with sentiment bar"
```

---

## Task 6: Wire BuddySection and FeedbackThemes into Dashboard

**Files:**
- Modify: `app/pages/index.vue`

### In `<script setup>`:

Add two new API fetches after the existing ones:

```typescript
const { data: buddySummaryData } = await useFetch('/api/buddies/dashboard-summary')
const { data: insightsData } = await useFetch('/api/insights/user-summary')
```

Add new computed values:

```typescript
const buddySummary = computed(() => buddySummaryData.value?.buddees || [])
const totalFeedbackToPublish = computed(() => buddySummaryData.value?.totalFeedbackToPublish ?? 0)

const insightsHasAnalysis = computed(() => insightsData.value?.hasAnalysis === true)
const insightsSentiment = computed(() => insightsData.value?.data?.sentimentData ?? null)
const insightsThemes = computed(() => {
  const themes = insightsData.value?.data?.themes
  return Array.isArray(themes) ? themes : []
})
```

### In `<template>`:

Add after the GoalProgress row (the last `animate-item` div), before the closing `</div>` of the container:

```html
          <!-- Feedback Themes (full width) -->
          <div class="animate-item" :style="{ '--delay': '400ms' }">
            <DashboardFeedbackThemes
              :has-analysis="insightsHasAnalysis"
              :sentiment="insightsSentiment"
              :themes="insightsThemes"
            />
          </div>

          <!-- Buddy Section (conditional) -->
          <div v-if="hasBuddies" class="animate-item" :style="{ '--delay': '450ms' }">
            <DashboardBuddySection
              :buddees="buddySummary"
              :total-feedback-to-publish="totalFeedbackToPublish"
            />
          </div>
```

- [ ] **Step 1: Update `<script setup>` with new fetches and computed values**

- [ ] **Step 2: Update `<template>` with FeedbackThemes and BuddySection**

- [ ] **Step 3: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat(dashboard): wire FeedbackThemes and BuddySection into layout"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Zod schema for buddy summary | `server/schemas/api.ts`, `server/types/index.ts` |
| 2 | Buddy dashboard summary endpoint | `server/api/buddies/dashboard-summary.get.ts` |
| 3 | BuddeeCard component | `app/components/dashboard/BuddeeCard.vue` |
| 4 | BuddySection wrapper component | `app/components/dashboard/BuddySection.vue` |
| 5 | FeedbackThemes component | `app/components/dashboard/FeedbackThemes.vue` |
| 6 | Wire into index.vue | `app/pages/index.vue` |

## What's NOT in This Phase

- Mobile responsive testing (manual QA)
- Animation polish beyond the existing staggered fadeInUp pattern (already applied)
- Edge case: many buddees (4+) handled with max 3 shown + "+N more" link
