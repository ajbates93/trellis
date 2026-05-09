# Dashboard Redesign Spec

## Overview

Redesign the main dashboard (`app/pages/index.vue`) to be more personalised, action-oriented, and visually engaging. The new dashboard leads with what matters most to the user right now (their upcoming review, unread feedback, buddy responsibilities) rather than presenting flat, equally-weighted stat cards.

**Interactive prototype**: See `dashboard-prototype.jsx` in the project root. This is a React/JSX file that can be previewed in any React renderer (e.g. Cowork, CodeSandbox). It shows the layout, component structure, hover states, and mock data. **The implementation must use Nuxt UI components, Tailwind CSS, and Heroicons — not the inline styles from the prototype.**

## Design Principles

- **Contextual priority**: The most important thing surfaces first (review countdown if within 30 days, unread feedback if no review is upcoming, etc.)
- **Personal narrative**: The dashboard tells the story of "where you are" rather than showing disconnected numbers
- **Buddy section is additive**: Users who are buddies see everything a regular user sees PLUS a buddy section below. Users without buddees never see the buddy section.
- **Match existing patterns**: All icons, colours, component conventions, and composables must match what's already in the codebase

---

## Existing Codebase Reference

### Icons (Heroicons via `@iconify-json/heroicons`)
All icons use the `i-heroicons-{name}` prefix. Key mappings from the sidebar:

| Feature | Icon |
|---------|------|
| Dashboard | `i-heroicons-squares-2x2` |
| Submit feedback | `i-heroicons-paper-airplane` |
| Brag Bucket | `i-heroicons-star` |
| Insights | `i-heroicons-chart-bar` |
| Feedback | `i-heroicons-chat-bubble-left-right` |
| Goals | `i-heroicons-flag` |
| Reviews | `i-heroicons-calendar-days` |
| Buddies | `i-heroicons-user-group` |
| Settings | `i-heroicons-cog-6-tooth` |
| Admin | `i-heroicons-shield-check` |

Additional icons likely needed for the new dashboard:

| Usage | Icon |
|-------|------|
| Eye / read | `i-heroicons-eye` |
| Check circle | `i-heroicons-check-circle` |
| Exclamation | `i-heroicons-exclamation-circle` |
| Trending up | `i-heroicons-arrow-trending-up` |
| Chevron right | `i-heroicons-chevron-right` |
| Fire / streak | `i-heroicons-fire` |
| Sparkles / AI | `i-heroicons-sparkles` |
| Clock | `i-heroicons-clock` |
| Plus | `i-heroicons-plus` |
| Document check | `i-heroicons-document-check` |

### Colour System
Dark mode is **forced** (`colorMode.preference: "dark"`). Use Tailwind's dark-mode palette:

| Semantic | Tailwind classes (dark) |
|----------|------------------------|
| Teal (primary/actions) | `bg-teal-900/20`, `text-teal-400`, `border-teal-500/20` |
| Purple (goals/buddy) | `bg-purple-900/20`, `text-purple-400`, `border-purple-500/20` |
| Amber (warnings/brag) | `bg-amber-900/20`, `text-amber-400`, `border-amber-500/20` |
| Blue (info) | `bg-blue-900/20`, `text-blue-400`, `border-blue-500/20` |
| Green (success) | `bg-green-900/20`, `text-green-400`, `border-green-500/20` |
| Rose (urgent) | `bg-rose-900/20`, `text-rose-400`, `border-rose-500/20` |

Surface/card backgrounds: `bg-gray-900/50` with `border border-gray-800` (matching existing `UCard` dark styling).

### Key Components to Reuse
- `UCard` — for all card containers
- `UButton` — for action buttons
- `UIcon` — for all iconography
- `UBadge` — for count badges and status pills
- `UAvatar` — for user avatars (buddee cards)
- `NuxtLink` — for all navigation
- `UDashboardPanel` — page wrapper (already used)

### Composables Available (no new APIs needed for Phase 1)
- `useAuth()` → `user` (with `preferredName`, `nextReviewDate`, `onboardingTasks`)
- `useBuddies()` → `buddies`, `hasBuddies`
- `useUnreadCount()` → `unreadCount`
- `useIncomingFeedbackCount()` → `incomingCount`
- `useOnboarding()` → `shouldShow`, `tasks`, `progressPercent`
- `useFetch("/api/goals")` → goals list (filter for `status === 'active'`)
- `useFetch("/api/dashboard/stats")` → `feedbackGiven`, `feedbackReceived`, `feedbackGivenTrend`, `feedbackReceivedTrend`, `daysUntilReview`

### Charting Library
The project uses **Unovis** (`@unovis/vue` ^1.6.1) — see `app/components/admin/EngagementChart.vue` for reference. Use `VisXYContainer`, `VisArea`, `VisLine`, `VisAxis`, etc. Do NOT add Recharts or Chart.js.

---

## Layout Structure

Container: `max-w-4xl mx-auto` (matching current dashboard). Page wrapped in `UDashboardPanel`.

### Section Order (top to bottom)

```
1. Header (greeting + contextual subtitle)
2. Quick Actions (3 buttons)
3. Mini Stat Row (3 compact metrics)
4. Primary Row: Review Countdown | Recent Activity  (2 columns)
5. Secondary Row: Streak Badge | Feedback Pulse chart  (narrow + wide)
6. Tertiary Row: Goals Progress | Feedback Themes  (2 columns)
7. ── Divider ── (only if user is a buddy)
8. Buddy Section: header + nudge bar + buddee cards
```

On mobile, all multi-column rows collapse to single column (stacked).

---

## Section Specifications

### 1. Header

**Greeting**: Time-based ("Good morning/afternoon/evening"), using user's `preferredName` or `name`.

**Contextual subtitle** (one of these, in priority order):
- If `daysUntilReview` is not null and <= 30: "Your review with {buddyName} is in {days} days. Here's where you stand."
- If `unreadCount > 0`: "You have {count} unread feedback waiting for you."
- Default: "Here's your week at a glance."

The buddy name for the subtitle comes from the user's own buddy relationship (not their buddees). This may require looking up the user's `buddyId` to get their buddy's name — check if this is already available via `useAuth()` user object or needs a small fetch.

### 2. Quick Actions

Three equal-width buttons in a row. Each is a `UButton` variant (outline or ghost with coloured icon) linking to its target page.

| Button | Icon | Colour | Link |
|--------|------|--------|------|
| Submit feedback | `i-heroicons-paper-airplane` | teal | `/feedback/give` |
| Add to brag bucket | `i-heroicons-star` | amber | `/brag-bucket` |
| Update goals | `i-heroicons-flag` | purple | `/goals` |

These match the sidebar icons exactly.

### 3. Mini Stat Row

Three compact stat cards in a row. Each shows an icon, a large number, and a label. Cards are clickable and link to relevant pages.

| Stat | Icon | Colour | Data Source | Link |
|------|------|--------|-------------|------|
| Unread feedback | `i-heroicons-eye` | teal | `unreadCount` from `useUnreadCount()` | `/feedback/inbox` |
| Pending to publish | `i-heroicons-exclamation-circle` | amber | `incomingCount` from `useIncomingFeedbackCount()` | `/buddies/feedback` |
| Goals on track | `i-heroicons-arrow-trending-up` | purple | active goals count from `/api/goals` | `/goals` |

**Note**: "Pending to publish" only makes sense for buddies. If `!hasBuddies`, replace with a different stat or hide that card. Options: "Feedback this week" (feedbackGiven + feedbackReceived), or "Days until review" (daysUntilReview). Use conditional logic.

### 4. Review Countdown (left column)

Only shown if `daysUntilReview` is not null. If null, this space could show a different card (e.g. a "No review scheduled" state, or the Feedback Pulse chart could take full width).

**Header**: "NEXT REVIEW" label with `i-heroicons-calendar-days` icon in teal.

**Hero number**: The `daysUntilReview` value, large (text-5xl font-bold).

**Subtitle**: "April 28 with {buddyName}" — formatted date + buddy name.

**Circular progress ring**: SVG showing preparation completeness (X/3 ready).

**Preparation checklist** (from the reviewee's perspective — things THEY can do):

| Item | "Done" condition | Detail text | Link |
|------|-----------------|-------------|------|
| Review your recent feedback | User has visited /feedback/inbox since the last review (or all feedback is read) | "{N} received since last review" | `/feedback/inbox` |
| Update your goals | Any goal updated in last 14 days | "{N} active goals" | `/goals` |
| Add to your brag bucket | Achievement added since last review | "Have wins ready to discuss" | `/brag-bucket` |

**Implementation note**: Some of these "done" conditions don't have explicit tracking yet. For MVP, simplify:
- "Review feedback" = done if `unreadCount === 0`
- "Update goals" = done if any goal has `updatedAt` within last 14 days (may need to check the goals response)
- "Brag bucket" = done if any achievement has `createdAt` after the last review's `completedDate` (may need a new lightweight API or just check achievements count)

If precise tracking is too complex for MVP, these can be manual checkboxes that persist via the user's `onboardingTasks` or a new field, or simply omit the checklist and just show the countdown + stats.

### 5. Recent Activity (right column)

A feed of the user's recent events. Each item has a coloured icon, text description, and relative timestamp.

**Event types and their display:**

| Type | Icon | Colour | Example text |
|------|------|--------|-------------|
| Feedback received | `i-heroicons-chat-bubble-left-right` | teal | "You received feedback from {name}" |
| Feedback given | `i-heroicons-paper-airplane` | blue | "You submitted feedback for {name}" |
| Goal milestone | `i-heroicons-flag` | purple | "Milestone completed: \"{title}\"" |
| Brag bucket | `i-heroicons-star` | amber | "You added to your brag bucket: \"{title}\"" |
| Buddy feedback | `i-heroicons-paper-airplane` | blue | "{name} submitted feedback for your buddy, {buddee}" |
| Review completed | `i-heroicons-calendar-days` | green | "Review with {name} completed" |

**Unread indicator**: Feedback received items show a small teal dot if `isRead === false`.

**Data source**: This is a **new API endpoint** needed: `GET /api/dashboard/activity` that aggregates recent events across feedback, goals, achievements, and reviews. Returns a unified, sorted array. **For MVP**, this could be simplified to just showing recent feedback (received + given) since that data is already fetchable, and adding other event types later.

**"View all" link**: Links to... TBD. Could be a future dedicated activity page, or just links to `/feedback/inbox` for now.

### 6. Streak Badge (left, narrow)

Shows consecutive weeks the user has submitted feedback.

**Data**: Needs calculation — count consecutive weeks (backwards from current) where `feedbackGiven > 0`. **This is a new API addition** — could be added to the `/api/dashboard/stats` response as `feedbackStreak: number`.

**Display**: Flame icon (`i-heroicons-fire`), large streak number, "week streak" label, and a subtitle like "You've given feedback every week this month."

**If streak is 0**: Hide this component entirely, or show a motivational "Start your streak — submit feedback this week" message instead.

### 7. Feedback Pulse Chart (right, wide)

Area chart showing feedback given vs received over the last 12 weeks.

**Data**: Needs a **new API endpoint**: `GET /api/dashboard/feedback-pulse` returning:
```json
[
  { "week": "2026-W01", "given": 2, "received": 1 },
  { "week": "2026-W02", "given": 1, "received": 3 },
  ...
]
```

**Chart implementation**: Use Unovis (`VisXYContainer` + `VisArea` + `VisLine`), matching the pattern in `admin/EngagementChart.vue`. Two series: teal for given, purple for received.

**Legend**: Two dots (teal "Given", purple "Received") below the chart.

### 8. Goals Progress (left column)

Shows active goals with milestone progress bars.

**Data**: Already available from `useFetch("/api/goals")`. Filter for `status === 'active'`. Each goal has `milestones` array — count completed vs total.

**Display per goal**:
- Goal text (truncated if long)
- "{completed}/{total}" milestone count
- Progress bar: gradient from purple→teal if < 50%, solid teal if > 50%, green if 100%

**"View all" link**: `/goals`

### 9. Feedback Themes (right column)

Shows AI-generated sentiment breakdown and topic themes from the user's feedback.

**Data**: From `GET /api/insights/user-summary` — returns `sentimentData` (positive/constructive/neutral percentages) and `themes` (string array).

**Display**:
- Sparkles icon (`i-heroicons-sparkles`) with "Feedback Themes" header
- Horizontal stacked bar: teal (positive), amber (constructive), gray (neutral)
- Percentage labels below
- Theme tags as `UBadge` components with varied colours

**Empty state**: If no insights have been generated, show "Submit more feedback to unlock insights" with a link to `/insights`.

---

## Buddy Section (Conditional)

Only rendered if `hasBuddies === true` from `useBuddies()`.

### Section Divider
A subtle horizontal line with gradient fade: `bg-gradient-to-r from-transparent via-gray-800 to-transparent`.

### Section Header
- `i-heroicons-user-group` icon in purple
- "Your Buddees" heading
- Count badge showing number of buddees
- "View all →" link to `/buddies`

### Nudge Bar (conditional)
Shown if there's pending feedback to publish OR a buddee's review is within 14 days.

**Text examples**:
- "You have **4 feedback** waiting to be published."
- "**Priya Sharma**'s review is in 8 days."
- Both combined if applicable.

**Style**: Purple-tinted background with `i-heroicons-exclamation-circle` icon.

### Buddee Cards
One card per buddee, laid out in a flex row (wrapping on mobile).

**Each card contains**:
- **Header**: Avatar (initials fallback via `UAvatar`), name, role, status badge
- **Status badge colours**:
  - "On track" → teal/green
  - "Needs attention" → amber (e.g. no feedback received recently)
  - "Review in {N}d" → rose (review within 14 days)
- **Metrics row** (3 compact boxes):
  - "To publish" — count of unpublished feedback for this buddee (amber highlight if > 0)
  - "Received" — total feedback received since last review
  - "Goals" — active goals count
- **Action buttons**:
  - "Review & publish" (primary, purple) — shown if feedbackToPublish > 0 → links to `/buddies/feedback`
  - "View profile" (outline) → links to `/buddies/{id}`

**Data source**: `useBuddies()` returns the buddees array. For each buddee, additional data (feedback counts, goals) may need to be fetched. Options:
- **Option A (simple)**: Add a `GET /api/buddies/dashboard-summary` endpoint that returns all buddee summaries in one call
- **Option B (existing)**: Combine data from `/api/feedback/for-buddy` (already returns per-buddee feedback) and `/api/goals/buddies`

---

## New API Endpoints Needed

| Endpoint | Returns | Priority |
|----------|---------|----------|
| `GET /api/dashboard/activity` | Unified recent events feed (feedback, goals, achievements, reviews) | Phase 1 (can simplify to feedback-only for MVP) |
| `GET /api/dashboard/feedback-pulse` | 12-week feedback given/received breakdown | Phase 1 |
| Add `feedbackStreak` to `/api/dashboard/stats` | Consecutive weeks with feedback given | Phase 1 |
| `GET /api/buddies/dashboard-summary` | Per-buddee metrics (feedback to publish, received, goals, next review, status) | Phase 1 (if buddy) |

---

## Onboarding State

The existing `OnboardingWidget` should still appear for new users who haven't completed onboarding tasks. Two options:

1. **Keep the current widget** — it already renders conditionally via `shouldShow` from `useOnboarding()`. It can overlay on top of the new dashboard.
2. **Integrate into the dashboard** — replace the review countdown / activity feed with a "Getting Started" hero card when `shouldShow` is true. Once all 4 tasks are done, the normal dashboard appears.

**Recommendation**: Option 1 for MVP (no extra work), consider Option 2 as a polish pass.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No review scheduled | Hide Review Countdown. Let Feedback Pulse chart or Activity Feed take full width. |
| No feedback received yet | Activity feed shows empty state: "No activity yet. Submit your first feedback to get started." |
| User is not a buddy | Hide "Pending to publish" mini stat. Hide entire buddy section. |
| No AI insights generated | Feedback Themes card shows "Not enough feedback for insights yet" with link to `/insights`. |
| Streak is 0 | Hide streak badge, or show motivational prompt. |
| Many buddees (4+) | Buddee cards should wrap or scroll horizontally. Consider showing max 3 with "+2 more" link. |
| Mobile viewport | All grid columns collapse to single column. Quick actions stack vertically. Buddee cards stack. |

---

## Implementation Order

**Phase 1 — Core Layout** (can ship independently):
1. Replace current dashboard template with new layout structure
2. Wire up Header, Quick Actions, Mini Stats using existing composables
3. Implement Review Countdown with simplified "done" logic
4. Implement Goals Progress (data already available)

**Phase 2 — New Data**:
5. Build `GET /api/dashboard/activity` endpoint
6. Build `GET /api/dashboard/feedback-pulse` endpoint
7. Add `feedbackStreak` to stats endpoint
8. Implement Activity Feed, Feedback Pulse chart, and Streak Badge components

**Phase 3 — Buddy Section**:
9. Build `GET /api/buddies/dashboard-summary` endpoint
10. Implement Buddy Section with buddee cards
11. Implement nudge bar logic

**Phase 4 — Polish**:
12. Feedback Themes integration (insights API already exists)
13. Empty states and edge case handling
14. Mobile responsive testing
15. Animation/transitions (staggered entry, matching current dashboard pattern)

---

## Files to Modify / Create

### Modify
- `app/pages/index.vue` — complete rewrite of template and script
- `server/api/dashboard/stats.get.ts` — add `feedbackStreak` field

### Create (components)
- `app/components/dashboard/ReviewCountdown.vue`
- `app/components/dashboard/QuickActions.vue`
- `app/components/dashboard/MiniStatRow.vue`
- `app/components/dashboard/ActivityFeed.vue`
- `app/components/dashboard/FeedbackPulse.vue`
- `app/components/dashboard/StreakBadge.vue`
- `app/components/dashboard/GoalProgress.vue`
- `app/components/dashboard/FeedbackThemes.vue`
- `app/components/dashboard/BuddySection.vue`
- `app/components/dashboard/BuddeeCard.vue`

### Create (API)
- `server/api/dashboard/activity.get.ts`
- `server/api/dashboard/feedback-pulse.get.ts`
- `server/api/buddies/dashboard-summary.get.ts`
