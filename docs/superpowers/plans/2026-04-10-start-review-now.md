# Start Review Now Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Start Now" button to the buddy reviews page that creates a review timestamped to the current moment and navigates directly to the review detail page.

**Architecture:** Client-side shortcut using the existing `POST /api/reviews` endpoint. A new `startReviewNow()` function calls the API with the current date/time and auto-generated name, then navigates to `/reviews/:id`. The `EmptyState` component gets an `#actions` slot for multi-button support.

**Tech Stack:** Vue 3, Nuxt UI, date-fns, date-fns-tz

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/components/EmptyState.vue` | Modify | Add `#actions` slot for multi-button support |
| `app/pages/buddies/reviews.vue` | Modify | Add Start Now button + logic, rename Create Review to Schedule Review, update empty states |

---

### Task 1: Add `#actions` slot to EmptyState component

**Files:**
- Modify: `app/components/EmptyState.vue:76-97` (template section)

- [ ] **Step 1: Add the `#actions` slot to the template**

In `app/components/EmptyState.vue`, replace the existing `<UButton>` block (lines 87-96) with a slot that falls back to the current button:

```vue
<template>
  <div :class="containerClasses">
    <div :class="iconContainerClasses">
      <UIcon :name="icon" :class="iconClasses" />
    </div>
    <h3 :class="headingClasses">
      {{ heading }}
    </h3>
    <p v-if="description" :class="descriptionClasses">
      {{ description }}
    </p>
    <slot name="actions">
      <UButton
        v-if="buttonText"
        :icon="buttonIcon"
        :size="buttonSize"
        :to="buttonTo"
        @click="handleButtonClick"
      >
        {{ buttonText }}
      </UButton>
    </slot>
  </div>
</template>
```

The only change is wrapping the existing `<UButton>` in `<slot name="actions">`. The button becomes the default slot content — all existing usages are unaffected.

- [ ] **Step 2: Verify existing empty states still render**

Run: `npm run dev`

Navigate to a page that uses `EmptyState` with `buttonText` (e.g., buddy reviews with no reviews). Confirm the single button still renders correctly.

- [ ] **Step 3: Commit**

```bash
git add app/components/EmptyState.vue
git commit -m "feat: add #actions slot to EmptyState component"
```

---

### Task 2: Add `startReviewNow` function to buddy reviews page

**Files:**
- Modify: `app/pages/buddies/reviews.vue:170-178` (state section, add new ref)
- Modify: `app/pages/buddies/reviews.vue:278` (after `createReview`, add new function)

- [ ] **Step 1: Add `isStartingNow` ref**

In `app/pages/buddies/reviews.vue`, after the existing `isCreating` ref (line 177), add:

```typescript
const isStartingNow = ref(false);
```

- [ ] **Step 2: Add `startReviewNow` function**

After the `createReview` function (after line 278), add:

```typescript
// Start review immediately and navigate to detail page
const startReviewNow = async () => {
  if (!selectedBuddyId.value) return;

  isStartingNow.value = true;

  try {
    const now = new Date();
    const reviewName = format(now, "MMMM yyyy");

    // Convert current time from user's timezone to UTC
    const { getUserTimezone } = useUserTimezone();
    const userTz = getUserTimezone();
    const dateTimeString = format(now, "yyyy-MM-dd'T'HH:mm");
    const utcDate = fromZonedTime(dateTimeString, userTz);
    const utcDateString = utcDate.toISOString();

    const response = await $fetch("/api/reviews", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        scheduledDate: utcDateString,
        name: reviewName,
      },
    });

    await navigateTo(`/reviews/${(response as any).review.id}`);
  } catch (error: any) {
    console.error("Failed to start review:", error);
    toast.add({
      title: "Failed to start review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isStartingNow.value = false;
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add app/pages/buddies/reviews.vue
git commit -m "feat: add startReviewNow function to buddy reviews"
```

---

### Task 3: Update header buttons

**Files:**
- Modify: `app/pages/buddies/reviews.vue:425-431` (header button area)

- [ ] **Step 1: Replace single button with two buttons**

Replace the existing `<UButton>` (lines 425-431):

```vue
<UButton
  v-if="selectedBuddyId"
  icon="i-heroicons-plus"
  @click="isCreateModalOpen = true"
>
  Create Review
</UButton>
```

With two buttons:

```vue
<div v-if="selectedBuddyId" class="flex items-center gap-2">
  <UButton
    icon="i-heroicons-play"
    color="primary"
    :loading="isStartingNow"
    @click="startReviewNow"
  >
    Start Now
  </UButton>
  <UButton
    icon="i-heroicons-plus"
    color="info"
    @click="isCreateModalOpen = true"
  >
    Schedule Review
  </UButton>
</div>
```

- [ ] **Step 2: Verify buttons render correctly**

Run: `npm run dev`

Navigate to Buddies > Reviews with a buddy selected. Confirm:
- Two buttons appear: green "Start Now" with play icon, blue "Schedule Review" with plus icon
- "Schedule Review" opens the existing create modal
- Both buttons disappear when no buddy is selected

- [ ] **Step 3: Commit**

```bash
git add app/pages/buddies/reviews.vue
git commit -m "feat: add Start Now and Schedule Review header buttons"
```

---

### Task 4: Update empty states to use `#actions` slot

**Files:**
- Modify: `app/pages/buddies/reviews.vue:436-446` (no reviews empty state)
- Modify: `app/pages/buddies/reviews.vue:492-503` (no upcoming reviews empty state)

- [ ] **Step 1: Update "no reviews at all" empty state**

Replace the first `EmptyState` (lines 437-446):

```vue
<EmptyState
  v-if="upcomingReviews.length === 0 && pastReviews.length === 0"
  icon="i-heroicons-calendar-days"
  heading="No reviews yet"
  :description="`${selectedBuddy.name} doesn't have any scheduled reviews yet.`"
  button-text="Create First Review"
  button-icon="i-heroicons-plus"
  variant="primary"
  @button-click="isCreateModalOpen = true"
/>
```

With:

```vue
<EmptyState
  v-if="upcomingReviews.length === 0 && pastReviews.length === 0"
  icon="i-heroicons-calendar-days"
  heading="No reviews yet"
  :description="`${selectedBuddy.name} doesn't have any scheduled reviews yet.`"
  variant="primary"
>
  <template #actions>
    <div class="flex items-center justify-center gap-2">
      <UButton
        icon="i-heroicons-play"
        color="primary"
        size="lg"
        :loading="isStartingNow"
        @click="startReviewNow"
      >
        Start Now
      </UButton>
      <UButton
        icon="i-heroicons-plus"
        color="info"
        size="lg"
        @click="isCreateModalOpen = true"
      >
        Schedule Review
      </UButton>
    </div>
  </template>
</EmptyState>
```

- [ ] **Step 2: Update "no upcoming reviews" empty state**

Replace the second `EmptyState` (lines 492-503):

```vue
<EmptyState
  v-else
  icon="i-heroicons-calendar-days"
  icon-color="text-gray-400"
  icon-bg-color="bg-gray-100 dark:bg-gray-800"
  heading="No upcoming review"
  :description="`${selectedBuddy?.name} has no scheduled reviews coming up`"
  button-text="Schedule Review"
  button-icon="i-heroicons-plus"
  variant="secondary"
  @button-click="isCreateModalOpen = true"
/>
```

With:

```vue
<EmptyState
  v-else
  icon="i-heroicons-calendar-days"
  icon-color="text-gray-400"
  icon-bg-color="bg-gray-100 dark:bg-gray-800"
  heading="No upcoming review"
  :description="`${selectedBuddy?.name} has no scheduled reviews coming up`"
  variant="secondary"
>
  <template #actions>
    <div class="flex items-center justify-center gap-2">
      <UButton
        icon="i-heroicons-play"
        color="primary"
        :loading="isStartingNow"
        @click="startReviewNow"
      >
        Start Now
      </UButton>
      <UButton
        icon="i-heroicons-plus"
        color="info"
        @click="isCreateModalOpen = true"
      >
        Schedule Review
      </UButton>
    </div>
  </template>
</EmptyState>
```

- [ ] **Step 3: Verify all empty states**

Run: `npm run dev`

Test each empty state:
1. Select a buddy with no reviews at all — confirm two buttons appear centered
2. Select a buddy with only past reviews (no upcoming) — confirm two buttons appear in the "no upcoming" section
3. Confirm the "no past reviews" empty state is unchanged (no buttons)

- [ ] **Step 4: Commit**

```bash
git add app/pages/buddies/reviews.vue
git commit -m "feat: update empty states with Start Now + Schedule Review buttons"
```

---

### Task 5: End-to-end manual test

- [ ] **Step 1: Test the full "Start Now" flow**

Run: `npm run dev`

1. Navigate to Buddies > Reviews
2. Select a buddy
3. Click "Start Now"
4. Confirm: a loading spinner appears on the button
5. Confirm: you are navigated to `/reviews/:id` (the new review's detail page)
6. Confirm: the review name is the current month/year (e.g., "April 2026")
7. Confirm: the review's scheduled date/time is approximately now

- [ ] **Step 2: Test "Schedule Review" still works**

1. Navigate back to Buddies > Reviews
2. Click "Schedule Review"
3. Confirm: the create modal opens as before
4. Fill in a date and confirm — review is created normally

- [ ] **Step 3: Test empty states**

1. Find or create a buddy with no reviews — confirm two buttons appear
2. Click "Start Now" from the empty state — confirm it works identically

- [ ] **Step 4: Run linting and type check**

```bash
npx eslint app/components/EmptyState.vue app/pages/buddies/reviews.vue --fix
npx nuxi typecheck
```

- [ ] **Step 5: Final commit (if lint fixes were needed)**

```bash
git add -A
git commit -m "fix: lint fixes for start review now feature"
```
