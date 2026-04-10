# Start Review Now — Design Spec

**Linear issue:** [TRE-27](https://linear.app/pocketworks/issue/TRE-27/add-start-review-now-quick-action)
**Date:** 2026-04-10

## Problem

Buddies who want to start an ad-hoc review right now must go through the full scheduling modal — picking a date, optionally a time, and confirming. This adds friction to a common real-world scenario where the buddy is sitting down with their reviewee and just wants to jump in.

## Solution

Add a "Start Now" button alongside a renamed "Schedule Review" button on the buddy reviews page. "Start Now" creates a review timestamped to the current moment and immediately navigates to the review detail page (`/reviews/:id`), skipping the modal entirely.

## Approach

Client-side shortcut using the existing `POST /api/reviews` endpoint. No new API endpoints, no database schema changes, no new review statuses.

## UI Changes

### Header buttons

Replace the single "Create Review" button with two side-by-side buttons:

| Button | Color | Icon | Variant | Action |
|--------|-------|------|---------|--------|
| Start Now | green (primary) | `i-heroicons-play` | solid | Call `startReviewNow()` |
| Schedule Review | blue (info) | `i-heroicons-plus` | solid | Open create modal (existing behavior) |

Both buttons are only visible when a buddy is selected (`v-if="selectedBuddyId"`).

### Empty states

Three empty states on the buddy reviews page currently show a single button. All three get the same two-button treatment:

1. **No reviews at all** — currently "Create First Review", becomes "Start Now" + "Schedule Review"
2. **No upcoming reviews** — currently "Schedule Review", becomes "Start Now" + "Schedule Review"
3. **No past reviews** — no button changes (this one has no action button)

### EmptyState component changes

Add a `#actions` slot to `app/components/EmptyState.vue`:

- When the `#actions` slot is provided, render the slot content inside a flex container with a gap, replacing the default single button
- When no slot is provided, the existing `buttonText` / `buttonIcon` / `@button-click` props continue to work unchanged
- Backwards-compatible — no changes needed to existing EmptyState usages elsewhere in the app

Usage:

```vue
<EmptyState icon="..." heading="..." description="...">
  <template #actions>
    <UButton color="primary" icon="i-heroicons-play" @click="startReviewNow">Start Now</UButton>
    <UButton color="info" icon="i-heroicons-plus" @click="isCreateModalOpen = true">Schedule Review</UButton>
  </template>
</EmptyState>
```

## Logic

### `startReviewNow()` function

Added to `app/pages/buddies/reviews.vue`:

1. Guard: return early if no `selectedBuddyId`
2. Set `isStartingNow` ref to `true` (disables button, shows spinner)
3. Get current date/time
4. Convert to UTC using `fromZonedTime` (same pattern as existing `createReview`)
5. Auto-generate review name: `format(new Date(), "MMMM yyyy")` (e.g., "April 2026")
6. Call `POST /api/reviews` with `{ userId: selectedBuddyId, scheduledDate: utcDateString, name: generatedName }`
7. On success: navigate to `/reviews/:id` using `navigateTo()`
8. On error: show error toast (same pattern as existing error handling)
9. Set `isStartingNow` to `false` in `finally` block

### New state

- `isStartingNow` ref (boolean) — loading state for the Start Now button

## Files Changed

| File | Change |
|------|--------|
| `app/components/EmptyState.vue` | Add `#actions` slot with flex container |
| `app/pages/buddies/reviews.vue` | Add Start Now button, rename Create Review to Schedule Review, add `startReviewNow()` function, update empty states to use `#actions` slot |

## What does NOT change

- No new API endpoints
- No database schema changes
- No new review statuses (review is created as "scheduled", completed later from detail page)
- No changes to `app/pages/reviews/index.vue` (the personal reviews page — this is buddy-only)
- No changes to `app/pages/reviews/[id].vue` (the detail page)
- Existing create modal behavior is unchanged (just triggered by renamed button)
