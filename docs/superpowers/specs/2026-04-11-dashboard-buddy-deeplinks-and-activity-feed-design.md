# Dashboard: Buddy Deep Links & Full Recent Activity Feed

**Date:** 2026-04-11
**Status:** Draft
**Related:** `docs/dashboard-redesign-spec.md` (§5 Recent Activity)

## Context

Two small-to-medium improvements to the dashboard redesign, both surfaced by reviewing the live `BuddySection` and `ActivityFeed` components against the original spec:

1. **Buddy deep links** — the dashboard's buddee cards link to `/buddies/feedback` with no context, so users always land on whichever buddy `useSelectedBuddy` happens to be holding. Clicking "Review & publish" on Matej's card should land on Matej's feedback view.
2. **Recent Activity feed is feedback-only** — `ActivityFeed.vue` currently supports just `feedback_received` and `feedback_given`. The spec calls for six event types (feedback given/received, goal milestones, brag bucket, buddy feedback, review completed). This is the "full spec" implementation, not the MVP-lite shortcut.

Both changes are scoped to the existing dashboard redesign branch.

---

## Feature 1: Buddy Deep Links via Query Param

### Goal

Allow any part of the app to link to a buddy-zone page (`/buddies/feedback`, `/buddies/goals`, `/buddies/reviews`) with a specific buddy pre-selected, using `?buddy=<uuid>`.

### URL contract

- `/buddies/feedback?buddy=<uuid>` — pre-selects that buddy in `BuddySelector`.
- `/buddies/feedback` (no query param) — falls back to existing behaviour: last selected buddy from session state, else first buddy in the list.
- If `?buddy=<uuid>` refers to a buddy the current user doesn't have (stale link, revoked relationship, typo), the page falls back to the default behaviour *and* strips the invalid query param from the URL so the bad value doesn't persist in history.

### Implementation points

**`app/composables/useSelectedBuddy.ts` is the single point of change.** All three buddy-zone pages (`feedback.vue`, `goals.vue`, `reviews.vue`) use this composable, so updating it gives them deep-linking for free.

New behaviour inside the composable:

1. **Initial hydration.** On first run, read `route.query.buddy`. If present and resolvable to a real buddy (once `buddies` has loaded), seed `selectedBuddyId` with it. This runs *before* the existing "auto-select first buddy" fallback.
2. **Validation.** If the query param is present but doesn't match any buddy after load, log it, fall through to default selection, and call `router.replace` to remove the invalid param from the URL.
3. **Two-way sync.** When `selectedBuddyId` changes (user picks a different buddy from `BuddySelector`), call `router.replace` to update `?buddy=<new-id>`. Use `replace`, not `push`, to avoid polluting browser history with every dropdown interaction.
4. **Only sync on buddy-zone routes.** The composable shouldn't touch the URL when called from non-buddy pages. Check `route.path.startsWith('/buddies/')` before calling `router.replace`.

### Dashboard call-site change

`app/components/dashboard/BuddeeCard.vue`:

- `Review & publish` link becomes `` `/buddies/feedback?buddy=${buddee.id}` ``
- `View profile` stays as `/buddies/${buddee.id}` — that's the dedicated profile page, not the feedback view. No change needed.

No other call sites exist today. Future links from `GoalProgress` or other components can opt in the same way.

### Edge cases

- **SSR vs client hydration.** `useSelectedBuddy` runs on both. `useRoute()` is safe on the server; `useRouter().replace()` in the two-way sync watcher must be guarded so it only runs client-side (`if (import.meta.client)`), or it's fine inside a `watch` since that only fires after initial setup.
- **Concurrent mount.** If a user navigates from `/buddies/feedback?buddy=A` directly to `/buddies/goals?buddy=B` (same composable instance via `useState`), the watcher on `route.query.buddy` should re-hydrate. Implement as a `watch` on `() => route.query.buddy`, not just one-time init.

---

## Feature 2: Full Recent Activity Feed

### Goal

Replace the feedback-only activity feed with the full six-event spec. One unified endpoint aggregates events; `ActivityFeed.vue` renders them generically.

### New API endpoint

`GET /api/dashboard/activity`

**Query parameters:**
- `limit` (optional, default 15, max 50)

**Response shape:**
```ts
{
  activities: Array<{
    id: string            // unique per event (composite of type + source id)
    type: 'feedback_received' | 'feedback_given' | 'goal_milestone'
        | 'brag_bucket' | 'buddy_feedback' | 'review_completed'
    description: string   // pre-rendered text, e.g. "You received feedback from Matej"
    createdAt: string     // ISO timestamp — used for sort + relative time display
    href: string | null   // optional deep link, see below
    isRead: boolean | null // only meaningful for feedback_received
  }>
}
```

**Aggregation logic:**

Fetch recent rows from each source table (with sensible per-source limit, e.g. 20 each), normalise into the common shape, concat, sort by `createdAt` desc, slice to `limit`.

| Type | Source table | Filter | Timestamp field | Deep link (`href`) |
|---|---|---|---|---|
| `feedback_received` | `feedback` | `revieweeId = user.id`, `publishedAt IS NOT NULL` | `publishedAt` | `/feedback/inbox` |
| `feedback_given` | `feedback` | `reviewerId = user.id` | `createdAt` | `/feedback/inbox?tab=given` |
| `goal_milestone` | `goalMilestones` join `goals` | `goals.userId = user.id`, `isCompleted = true` | `completedAt` | `/goals` |
| `brag_bucket` | `achievements` | `userId = user.id` | `createdAt` | `/brag-bucket` |
| `buddy_feedback` | `feedback` join buddy list | `revieweeId IN (buddees)`, `publishedAt IS NOT NULL` | `publishedAt` | `` `/buddies/feedback?buddy=${revieweeId}` `` |
| `review_completed` | `reviewSchedules` | `userId = user.id` OR `buddyId = user.id`, `status = 'completed'` | `completedAt` (or `updatedAt` if that column doesn't exist — confirm during implementation) | `/reviews` |

**Description templates** (built server-side so the component stays dumb):

- `feedback_received`: `"You received feedback from {reviewerName}"`
- `feedback_given`: `"You submitted feedback for {revieweeName}"`
- `goal_milestone`: `"Milestone completed: \"{milestoneTitle}\""`
- `brag_bucket`: `"You added to your brag bucket: \"{title}\""`
- `buddy_feedback`: `"{reviewerName} submitted feedback for {buddeeName}"`
- `review_completed`: `"Review with {otherPartyName} completed"`

### Component changes

**`app/components/dashboard/ActivityFeed.vue`:**

- Widen the `Activity` type to the six-event union above.
- Expand `iconName`, `iconBgClass`, `iconColorClass` switch statements to cover all six types (icons + colours per the redesign spec table).
- Wrap each activity row in a `NuxtLink` when `href` is present, otherwise render as a plain div.
- Unread-dot logic stays as-is (only shows for `feedback_received` when `isRead === false`).
- Empty state unchanged.

**Dashboard page wiring:** replace the current hardcoded feedback-derived list with `useFetch('/api/dashboard/activity')` and pass `activities` to the component.

### Scope guardrails (YAGNI)

- **No pagination** — the "View all" link still points at `/feedback/inbox` for now (spec §5 says this is TBD). No dedicated activity page.
- **No real-time updates** — fetched once on dashboard mount, refreshed on normal page navigation. No websockets.
- **No filtering UI** — the feed shows everything in reverse chronological order.
- **No "read" tracking for non-feedback events** — only `feedback_received` has an unread concept today, and we're not building one for the other types.

---

## Testing

### Feature 1
- Visit `/buddies/feedback?buddy=<valid-id>` → BuddySelector shows that buddy, feedback data matches.
- Visit `/buddies/feedback?buddy=<invalid-id>` → falls back to first buddy, URL query param is stripped.
- Change buddy via dropdown → URL updates via `router.replace`, browser back button doesn't step through every selection.
- Refresh `/buddies/feedback?buddy=<id>` → state preserved.
- Dashboard `Review & publish` button from Matej's card → lands on Matej's feedback view.

### Feature 2
- Unit test the `/api/dashboard/activity` aggregation: seed one row per type, assert all six appear, correctly sorted, correctly templated.
- Test edge case: user with zero activity → empty state renders.
- Test edge case: user with 100+ feedback items → limit respected, no N+1.
- Component test: each of the six types renders with correct icon/colour.
- Visual QA on dashboard after wiring up.

---

## Out of scope

- Dedicated `/activity` page (future).
- Notification badges on sidebar for new activity (future).
- Marking non-feedback events as read (future).
- Slug-based buddy URLs (rejected in favour of UUID query param).
- Restructuring buddy-zone pages under `/buddies/feedback/[id]` path params (rejected — too invasive for the benefit).
