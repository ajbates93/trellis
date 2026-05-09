# Dashboard Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current flat dashboard with a personalised, action-oriented layout featuring a greeting header, quick actions, mini stats, review countdown with prep checklist, and goals progress.

**Architecture:** Page-level data fetching in `index.vue` with props passed to focused child components. All data comes from existing composables and API endpoints (no new endpoints in Phase 1). The review countdown prep checklist uses heuristic "done" conditions based on existing data (unread count, goal update dates, achievement existence).

**Tech Stack:** Nuxt 4 + Nuxt UI v4 (`UCard`, `UButton`, `UIcon`, `UBadge`, `NuxtLink`), Tailwind CSS (dark mode forced), Heroicons via `@iconify-json/heroicons`.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `app/components/dashboard/DashboardHeader.vue` | Time-based greeting + contextual subtitle |
| Create | `app/components/dashboard/QuickActions.vue` | 3 action buttons linking to key pages |
| Create | `app/components/dashboard/MiniStats.vue` | 3 compact clickable stat cards |
| Create | `app/components/dashboard/ReviewCountdown.vue` | Days countdown, circular progress, prep checklist |
| Create | `app/components/dashboard/GoalProgress.vue` | Active goals with milestone progress bars |
| Modify | `app/pages/index.vue` | Rewrite: fetch data, compose new components |

---

## Task 1: Create DashboardHeader Component

**Files:**
- Create: `app/components/dashboard/DashboardHeader.vue`

- [ ] **Step 1: Create the component file**

```vue
<template>
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold text-white">
      {{ greeting }}, {{ displayName }}
    </h1>
    <p class="mt-1 text-sm sm:text-base text-gray-400">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  userName: string | null
  daysUntilReview: number | null
  buddyName: string | null
  unreadCount: number
}

const props = defineProps<Props>()

const greeting = computed(() => {
  if (!import.meta.client) return 'Welcome back'
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => props.userName || 'there')

const subtitle = computed(() => {
  if (props.daysUntilReview !== null && props.daysUntilReview <= 30) {
    const withBuddy = props.buddyName ? ` with ${props.buddyName}` : ''
    return `Your review${withBuddy} is in ${props.daysUntilReview} days. Here's where you stand.`
  }
  if (props.unreadCount > 0) {
    return `You have ${props.unreadCount} unread feedback waiting for you.`
  }
  return "Here's your week at a glance."
})
</script>
```

- [ ] **Step 2: Verify component renders**

Run: `npm run dev`
Manually verify: not yet wired into the page — will be integrated in Task 6.

- [ ] **Step 3: Commit**

```bash
git add app/components/dashboard/DashboardHeader.vue
git commit -m "feat(dashboard): add DashboardHeader component with time-based greeting"
```

---

## Task 2: Create QuickActions Component

**Files:**
- Create: `app/components/dashboard/QuickActions.vue`

- [ ] **Step 1: Create the component file**

```vue
<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <UButton
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      variant="outline"
      block
      class="justify-center"
      :ui="{ base: 'border-gray-800 hover:border-' + action.borderHover }"
    >
      <template #leading>
        <UIcon :name="action.icon" :class="action.iconClass" />
      </template>
      <span :class="action.textClass">{{ action.label }}</span>
    </UButton>
  </div>
</template>

<script setup lang="ts">
const actions = [
  {
    label: 'Submit feedback',
    icon: 'i-heroicons-paper-airplane',
    to: '/feedback/give',
    iconClass: 'text-teal-400',
    textClass: 'text-teal-400',
    borderHover: 'teal-500/30',
  },
  {
    label: 'Add to brag bucket',
    icon: 'i-heroicons-star',
    to: '/brag-bucket',
    iconClass: 'text-amber-400',
    textClass: 'text-amber-400',
    borderHover: 'amber-500/30',
  },
  {
    label: 'Update goals',
    icon: 'i-heroicons-flag',
    to: '/goals',
    iconClass: 'text-purple-400',
    textClass: 'text-purple-400',
    borderHover: 'purple-500/30',
  },
]
</script>
```

**Note:** The `UButton` `ui` prop approach may need adjustment depending on how Nuxt UI v4 handles dynamic class overrides. If the `ui` prop doesn't support dynamic border classes, fall back to a plain `NuxtLink` styled with Tailwind:

```vue
<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <NuxtLink
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-800 hover:bg-gray-900/50 transition-all duration-150"
      :class="action.hoverBorder"
    >
      <UIcon :name="action.icon" class="text-lg" :class="action.iconClass" />
      <span class="text-sm font-medium" :class="action.textClass">{{ action.label }}</span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const actions = [
  {
    label: 'Submit feedback',
    icon: 'i-heroicons-paper-airplane',
    to: '/feedback/give',
    iconClass: 'text-teal-400',
    textClass: 'text-teal-400',
    hoverBorder: 'hover:border-teal-500/30',
  },
  {
    label: 'Add to brag bucket',
    icon: 'i-heroicons-star',
    to: '/brag-bucket',
    iconClass: 'text-amber-400',
    textClass: 'text-amber-400',
    hoverBorder: 'hover:border-amber-500/30',
  },
  {
    label: 'Update goals',
    icon: 'i-heroicons-flag',
    to: '/goals',
    iconClass: 'text-purple-400',
    textClass: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/30',
  },
]
</script>
```

Use whichever approach renders correctly. Test both if needed — prefer the `UButton` version if it works, since it follows the existing component conventions.

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/QuickActions.vue
git commit -m "feat(dashboard): add QuickActions component with 3 action buttons"
```

---

## Task 3: Create MiniStats Component

**Files:**
- Create: `app/components/dashboard/MiniStats.vue`

The middle stat ("Pending to publish") only makes sense for buddies. For non-buddies, show "Days to review" instead.

- [ ] **Step 1: Create the component file**

```vue
<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <NuxtLink
      v-for="stat in visibleStats"
      :key="stat.label"
      :to="stat.to"
      class="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-colors"
    >
      <UIcon :name="stat.icon" class="text-base" :class="stat.iconClass" />
      <div>
        <span class="text-xl font-bold text-white leading-none">{{ stat.value }}</span>
        <p class="text-xs text-gray-500 mt-0.5">{{ stat.label }}</p>
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
interface Props {
  unreadCount: number
  incomingCount: number
  hasBuddies: boolean
  activeGoalsCount: number
  totalGoalsCount: number
  daysUntilReview: number | null
}

const props = defineProps<Props>()

const visibleStats = computed(() => {
  const stats = [
    {
      label: 'Unread feedback',
      value: props.unreadCount,
      icon: 'i-heroicons-eye',
      iconClass: 'text-teal-400',
      to: '/feedback/inbox',
    },
  ]

  if (props.hasBuddies) {
    stats.push({
      label: 'Pending to publish',
      value: props.incomingCount,
      icon: 'i-heroicons-exclamation-circle',
      iconClass: 'text-amber-400',
      to: '/buddies/feedback',
    })
  } else {
    stats.push({
      label: props.daysUntilReview !== null ? 'Days to review' : 'No review scheduled',
      value: props.daysUntilReview ?? '-',
      icon: 'i-heroicons-calendar-days',
      iconClass: 'text-amber-400',
      to: '/reviews',
    })
  }

  stats.push({
    label: 'Goals on track',
    value: `${props.activeGoalsCount}/${props.totalGoalsCount}`,
    icon: 'i-heroicons-arrow-trending-up',
    iconClass: 'text-purple-400',
    to: '/goals',
  })

  return stats
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/MiniStats.vue
git commit -m "feat(dashboard): add MiniStats component with conditional buddy stat"
```

---

## Task 4: Create ReviewCountdown Component

**Files:**
- Create: `app/components/dashboard/ReviewCountdown.vue`

This is the most complex Phase 1 component. It shows a countdown, circular SVG progress ring, and a prep checklist with heuristic "done" conditions.

**Checklist "done" logic (MVP):**
| Item | Done when | Data source |
|------|-----------|-------------|
| Review your recent feedback | `unreadCount === 0` | `useUnreadCount()` |
| Update your goals | Any active goal `updatedAt` within last 14 days | Goals API |
| Add to your brag bucket | At least 1 achievement exists | Achievements API |

- [ ] **Step 1: Create the component file**

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800 relative overflow-hidden">
    <!-- Subtle teal glow -->
    <div class="absolute -top-10 -right-10 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

    <div class="relative">
      <div class="flex justify-between items-start">
        <!-- Left: countdown -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-calendar-days" class="text-teal-400 text-sm" />
            <span class="text-xs font-semibold text-teal-400 uppercase tracking-wider">Next Review</span>
          </div>
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-5xl font-bold text-white tabular-nums leading-none">{{ daysUntilReview }}</span>
            <span class="text-base text-gray-400">days away</span>
          </div>
          <p class="text-sm text-gray-400">
            {{ formattedDate }}<template v-if="buddyName"> with {{ buddyName }}</template>
          </p>
        </div>

        <!-- Right: circular progress -->
        <div class="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" class="-rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke-width="6" class="stroke-gray-800" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              class="stroke-teal-400"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="circumference * (1 - prepPercent / 100)"
              style="transition: stroke-dashoffset 0.8s ease"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-lg font-bold text-white">{{ prepDone }}/{{ prepItems.length }}</span>
            <span class="text-[10px] text-gray-500">ready</span>
          </div>
        </div>
      </div>

      <!-- Prep checklist -->
      <div class="mt-5 space-y-1.5">
        <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          Prepare for your review
        </span>
        <NuxtLink
          v-for="item in prepItems"
          :key="item.label"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
          :class="item.done ? 'bg-teal-900/20' : 'hover:bg-gray-800'"
        >
          <UIcon
            v-if="item.done"
            name="i-heroicons-check-circle"
            class="text-teal-400 text-base flex-shrink-0"
          />
          <div
            v-else
            class="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <span
              class="text-[13px] block"
              :class="item.done ? 'text-teal-400/85' : 'text-white'"
            >
              {{ item.label }}
            </span>
            <span class="text-[11px] text-gray-500">{{ item.detail }}</span>
          </div>
          <UIcon
            v-if="!item.done"
            name="i-heroicons-chevron-right"
            class="text-gray-600 text-sm flex-shrink-0"
          />
        </NuxtLink>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Goal {
  id: string
  status: string | null
  updatedAt: Date | string
  milestones: Array<{ isCompleted: boolean | null }>
}

interface Props {
  daysUntilReview: number
  reviewDate: string | null
  buddyName: string | null
  unreadCount: number
  goals: Goal[]
  achievementsCount: number
}

const props = defineProps<Props>()

const circumference = 2 * Math.PI * 34

const formattedDate = computed(() => {
  if (!props.reviewDate) return ''
  const date = new Date(props.reviewDate)
  return date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })
})

const feedbackReviewed = computed(() => props.unreadCount === 0)

const goalsUpdated = computed(() => {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  return props.goals
    .filter(g => g.status === 'active')
    .some(g => new Date(g.updatedAt) >= fourteenDaysAgo)
})

const bragBucketFresh = computed(() => props.achievementsCount > 0)

const prepItems = computed(() => [
  {
    label: 'Review your recent feedback',
    done: feedbackReviewed.value,
    detail: feedbackReviewed.value
      ? 'All caught up'
      : `${props.unreadCount} unread`,
    to: '/feedback/inbox',
  },
  {
    label: 'Update your goals',
    done: goalsUpdated.value,
    detail: `${props.goals.filter(g => g.status === 'active').length} active goals`,
    to: '/goals',
  },
  {
    label: 'Add to your brag bucket',
    done: bragBucketFresh.value,
    detail: bragBucketFresh.value
      ? 'Have wins ready to discuss'
      : 'Add recent achievements',
    to: '/brag-bucket',
  },
])

const prepDone = computed(() => prepItems.value.filter(p => p.done).length)
const prepPercent = computed(() =>
  Math.round((prepDone.value / prepItems.value.length) * 100),
)
</script>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/ReviewCountdown.vue
git commit -m "feat(dashboard): add ReviewCountdown with prep checklist and circular progress"
```

---

## Task 5: Create GoalProgress Component

**Files:**
- Create: `app/components/dashboard/GoalProgress.vue`

- [ ] **Step 1: Create the component file**

```vue
<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-white">Goals</h3>
      <NuxtLink to="/goals" class="text-xs text-teal-400 font-medium hover:text-teal-300">
        View all &rarr;
      </NuxtLink>
    </div>

    <div v-if="activeGoals.length === 0" class="text-sm text-gray-500 py-4 text-center">
      No active goals. <NuxtLink to="/goals" class="text-teal-400 hover:text-teal-300">Create one</NuxtLink>
    </div>

    <div v-else class="space-y-3.5">
      <div v-for="goal in activeGoals" :key="goal.id">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-[13px] text-white font-medium truncate pr-3">{{ goal.goalText }}</span>
          <span class="text-[11px] text-gray-500 flex-shrink-0">
            {{ goal.completedMilestones }}/{{ goal.totalMilestones }}
          </span>
        </div>
        <div class="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-600"
            :style="{ width: `${goal.percent}%` }"
            :class="progressBarClass(goal.percent)"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Goal {
  id: string
  goalText: string
  status: string | null
  milestones: Array<{ isCompleted: boolean | null }>
}

interface Props {
  goals: Goal[]
}

const props = defineProps<Props>()

const activeGoals = computed(() =>
  props.goals
    .filter(g => g.status === 'active')
    .map(g => {
      const total = g.milestones.length
      const completed = g.milestones.filter(m => m.isCompleted).length
      return {
        id: g.id,
        goalText: g.goalText,
        totalMilestones: total,
        completedMilestones: completed,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      }
    }),
)

function progressBarClass(percent: number): string {
  if (percent === 100) return 'bg-green-400'
  if (percent > 50) return 'bg-teal-400'
  return 'bg-gradient-to-r from-purple-400 to-teal-400'
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/dashboard/GoalProgress.vue
git commit -m "feat(dashboard): add GoalProgress with milestone progress bars"
```

---

## Task 6: Rewrite index.vue to Compose All Components

**Files:**
- Modify: `app/pages/index.vue`

This is the main integration task. It replaces the entire existing dashboard with the new layout, fetches all required data, and passes it as props to child components.

**Data sources:**
| Data | Source | Used by |
|------|--------|---------|
| User name | `useAuth().user` | DashboardHeader |
| Unread count | `useUnreadCount()` | DashboardHeader, MiniStats, ReviewCountdown |
| Has buddies | `useBuddies()` | MiniStats |
| Incoming count | `useIncomingFeedbackCount()` | MiniStats |
| Days until review | `/api/dashboard/stats` | DashboardHeader, MiniStats, ReviewCountdown |
| Goals | `/api/goals` | MiniStats, ReviewCountdown, GoalProgress |
| Upcoming reviews | `/api/reviews/upcoming` | ReviewCountdown (buddy name, date) |
| Achievements | `/api/achievements` | ReviewCountdown (brag bucket check) |
| Onboarding | `useOnboarding()` | OnboardingWidget (kept as-is) |

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `app/pages/index.vue` with:

```vue
<template>
  <UDashboardPanel id="home">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2 max-w-4xl mx-auto">
        <div ref="container" class="space-y-6">
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
            <QuickActions />
          </div>

          <!-- Mini Stats -->
          <div class="animate-item" :style="{ '--delay': '150ms' }">
            <MiniStats
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

          <!-- Primary Row: Review Countdown + placeholder for Activity Feed (Phase 2) -->
          <div
            v-if="daysUntilReview !== null"
            class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <ReviewCountdown
              :days-until-review="daysUntilReview"
              :review-date="nextReviewDate"
              :buddy-name="nextReviewBuddyName"
              :unread-count="unreadCount"
              :goals="allGoals"
              :achievements-count="achievementsCount"
            />
            <!-- GoalProgress fills the second column when review countdown is present -->
            <GoalProgress :goals="allGoals" />
          </div>

          <!-- If no review scheduled, show GoalProgress full width -->
          <div
            v-else
            class="animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <GoalProgress :goals="allGoals" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Dashboard',
})

// Composables
const { user } = useAuth()
const { hasBuddies } = useBuddies()
const { unreadCount } = useUnreadCount()
const { incomingCount } = useIncomingFeedbackCount()
const { shouldShow: showOnboarding } = useOnboarding()

// API data
const { data: statsData } = await useFetch('/api/dashboard/stats')
const { data: goalsData } = await useFetch('/api/goals')
const { data: reviewsData } = await useFetch('/api/reviews/upcoming')
const { data: achievementsData } = await useFetch('/api/achievements')

// Computed values
const daysUntilReview = computed(() => statsData.value?.daysUntilReview ?? null)

const allGoals = computed(() => goalsData.value?.goals || [])

const activeGoalsCount = computed(
  () => allGoals.value.filter((g: { status: string | null }) => g.status === 'active').length,
)

const nextReview = computed(() => {
  const reviews = reviewsData.value?.reviews
  if (!reviews || reviews.length === 0) return null
  return reviews[0]
})

const nextReviewBuddyName = computed(() => nextReview.value?.buddy?.name || null)

const nextReviewDate = computed(() => nextReview.value?.scheduledDate || null)

const achievementsCount = computed(() => achievementsData.value?.achievements?.length || 0)
</script>

<style scoped>
.animate-item {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`

Verify in browser at `http://localhost:3000`:
1. Greeting shows time-appropriate message with user's name
2. Subtitle is contextual (review countdown, unread feedback, or default)
3. Three quick action buttons render and link correctly
4. Mini stats show correct values (unread, pending/days-to-review, goals)
5. If review is scheduled: countdown card shows with circular progress and checklist
6. Goals card shows active goals with progress bars
7. Onboarding widget still appears for new users
8. Mobile: everything stacks to single column

- [ ] **Step 3: Run build to check for type errors**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

If there are type issues with the API response shapes, add explicit type annotations to the `useFetch` calls. For example:

```typescript
const { data: goalsData } = await useFetch<{ goals: Array<{ id: string; goalText: string; status: string | null; updatedAt: string; milestones: Array<{ isCompleted: boolean | null }> }> }>('/api/goals')
```

- [ ] **Step 4: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat(dashboard): rewrite dashboard with new personalised layout (Phase 1)"
```

---

## Task 7: Visual Polish and Edge Cases

**Files:**
- Modify: `app/components/dashboard/ReviewCountdown.vue` (if needed)
- Modify: `app/components/dashboard/MiniStats.vue` (if needed)
- Modify: `app/pages/index.vue` (if needed)

- [ ] **Step 1: Test edge cases in browser**

Check each scenario by modifying data or user state:

| Scenario | Expected |
|----------|----------|
| No review scheduled (`daysUntilReview` is null) | ReviewCountdown hidden; GoalProgress takes full width |
| No active goals | GoalProgress shows empty state with "Create one" link |
| User is not a buddy | MiniStats shows "Days to review" instead of "Pending to publish" |
| All feedback read (`unreadCount === 0`) | Checklist item shows green check + "All caught up" |
| No achievements | Checklist brag bucket item shows empty circle + "Add recent achievements" |

- [ ] **Step 2: Fix any visual issues found**

Apply targeted fixes. Common issues to watch for:
- `UCard` padding/border differences from the prototype (Nuxt UI v4 may have different defaults)
- SVG circular progress rendering — ensure the `stroke-dasharray` and `stroke-dashoffset` values are correct
- Text truncation on small screens

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(dashboard): polish edge cases and visual alignment"
```

---

## Clarifications and Design Decisions

### Brag Bucket "Done" Check
The spec suggests checking if achievements exist since the last completed review, but getting the last completed review date requires a new query. **For MVP, we check if any achievements exist at all.** This can be refined in Phase 2 by either:
1. Adding a `lastCompletedReviewDate` field to the `/api/dashboard/stats` response
2. Creating a lightweight `/api/reviews/last-completed` endpoint

### Buddy Name in Subtitle
The user's buddy name comes from `/api/reviews/upcoming` (which returns the buddy object for each review). If no upcoming review exists, the subtitle won't reference a buddy name.

### Layout When No Review Scheduled
The prototype always shows ReviewCountdown in a 2-column layout with Activity Feed. Since Activity Feed is Phase 2, and ReviewCountdown may not exist, the Phase 1 layout adapts:
- **Review scheduled:** 2-column grid with ReviewCountdown + GoalProgress
- **No review:** Single GoalProgress card (full width)

Phase 2 will introduce the Activity Feed alongside ReviewCountdown in the 2-column layout.

### Existing QuickStatCard Component
The old `QuickStatCard` component is NOT removed — it may be used elsewhere. The new `MiniStats` component uses its own more compact design.

---

## What's NOT in Phase 1

These sections from the spec are deferred to later phases:
- **Activity Feed** (Phase 2 — requires new `/api/dashboard/activity` endpoint)
- **Feedback Pulse chart** (Phase 2 — requires new `/api/dashboard/feedback-pulse` endpoint)
- **Streak Badge** (Phase 2 — requires `feedbackStreak` added to stats endpoint)
- **Feedback Themes** (Phase 4 — uses existing insights API)
- **Buddy Section** (Phase 3 — requires new `/api/buddies/dashboard-summary` endpoint)
