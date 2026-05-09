# Dashboard Redesign Phase 1 — Completion Summary

## What Was Built

Replaced the flat, generic dashboard with a personalised, action-oriented layout. The new dashboard leads with what matters most to the user (upcoming review, unread feedback) rather than equally-weighted stat cards.

## Files Created/Modified

### New Components (all in `app/components/dashboard/`)

| File | Nuxt Template Name | Purpose |
|------|-------------------|---------|
| `Header.vue` | `<DashboardHeader>` | Time-based greeting ("Good morning/afternoon/evening") + contextual subtitle. Subtitle priority: review countdown (<=30 days) > unread feedback count > default "week at a glance". Special cases for 0 days ("today") and 1 day ("tomorrow"). |
| `QuickActions.vue` | `<DashboardQuickActions>` | 3 coloured action buttons: Submit feedback (teal), Add to brag bucket (amber), Update goals (purple). Uses `NuxtLink` with Tailwind hover states (not UButton, since Nuxt UI v4's `ui` prop doesn't support dynamic border classes cleanly). |
| `MiniStats.vue` | `<DashboardMiniStats>` | 3 compact clickable stat cards. Unread feedback (teal), middle card is conditional — "Pending to publish" for buddies or "Days to review" for non-buddies, Goals on track as X/Y (purple). Each links to its relevant page. |
| `ReviewCountdown.vue` | `<DashboardReviewCountdown>` | Hero countdown (text-5xl days), formatted date with buddy name, SVG circular progress ring (radius 34, stroke-width 6), 3-item prep checklist. Only shown when `daysUntilReview !== null`. |
| `GoalProgress.vue` | `<DashboardGoalProgress>` | Active goals with milestone progress bars. Gradient colours: purple-to-teal (<=50%), teal (>50%), green (100%). Empty state with "Create one" link. |

### Modified

| File | Change |
|------|--------|
| `app/pages/index.vue` | Complete rewrite. Old content (QuickStatCard grid, command palette trigger, contextual suggestions, quick links) replaced with new component composition. |
| `CLAUDE.md` | Added "Git Commit Rules" section — never add Co-Authored-By trailers. |

## Architecture Decisions

### Data Flow
All data is fetched at the page level in `index.vue` and passed as props to child components. No component fetches its own data. This avoids duplicate API calls and keeps components reusable.

**Data sources used in `index.vue`:**
```
Composables:
- useAuth()                    → user (preferredName, name)
- useBuddies()                → hasBuddies
- useUnreadCount()             → unreadCount
- useIncomingFeedbackCount()   → incomingCount
- useOnboarding()              → shouldShow

API fetches:
- /api/dashboard/stats         → daysUntilReview
- /api/goals                   → goals array (with milestones)
- /api/reviews/upcoming        → next review (buddy name, scheduled date)
- /api/achievements            → achievements (count for brag bucket check)
```

### Review Countdown Prep Checklist — "Done" Conditions (MVP)

| Item | Done when | Notes |
|------|-----------|-------|
| Review your recent feedback | `unreadCount === 0` | Simple, works well |
| Update your goals | Any active goal `updatedAt` within last 14 days | Uses `new Date()` in computed — slightly impure but fine for page lifecycle |
| Add to your brag bucket | `achievementsCount > 0` | **MVP simplification**: checks if ANY achievements exist, not "since last completed review". Refining this requires knowing the last completed review date (new query). |

### Buddy Name Resolution
The user object has `buddyId` but NOT `buddyName`. The buddy name for the subtitle/countdown comes from `/api/reviews/upcoming` which returns `buddy: { id, name, ... }` for each review. If no review is scheduled, buddy name is null and the subtitle won't reference it.

### Component Naming Convention
Nuxt prefixes subdirectory components with the folder name. `app/components/dashboard/Header.vue` → `<DashboardHeader>`. The file was originally named `DashboardHeader.vue` which produced the redundant `<DashboardDashboardHeader>` — renamed to `Header.vue` to fix this.

### Layout Adaptation (No Activity Feed Yet)
The spec shows ReviewCountdown + ActivityFeed in a 2-column layout. Since ActivityFeed is Phase 2:
- **Review scheduled**: 2-column grid with ReviewCountdown + GoalProgress
- **No review**: GoalProgress full width

### SSR Consideration
`DashboardHeader` greeting uses `import.meta.client` guard — returns "Welcome back" on server, time-based greeting on client. This causes a hydration mismatch flash. Acceptable for MVP; can fix with `useRequestHeaders` or `<ClientOnly>` wrapper later.

## Commits (oldest first)

```
0ae4eef feat(dashboard): add DashboardHeader component with time-based greeting
1b72a1e feat(dashboard): add QuickActions component with 3 action buttons
79bcb52 feat(dashboard): add MiniStats component with conditional buddy stat
1481ba5 feat(dashboard): add ReviewCountdown with prep checklist and circular progress
42f67f3 feat(dashboard): add GoalProgress with milestone progress bars
95e2289 fix(dashboard): fix invalid Tailwind duration class and subtitle edge cases
7bb9ddf feat(dashboard): rewrite dashboard with new personalised layout (Phase 1)
f8b0b39 docs: add git commit rules to CLAUDE.md (no co-authored-by)
462cc90 refactor(dashboard): rename DashboardHeader to Header to avoid redundant prefix
```

## What Was NOT Built (Deferred)

| Section | Phase | Blocker |
|---------|-------|---------|
| Activity Feed | Phase 2 | Needs new `GET /api/dashboard/activity` endpoint |
| Feedback Pulse chart (Unovis) | Phase 2 | Needs new `GET /api/dashboard/feedback-pulse` endpoint |
| Streak Badge | Phase 2 | Needs `feedbackStreak` field added to `/api/dashboard/stats` |
| Feedback Themes | Phase 4 | Uses existing `/api/insights/user-summary` — just needs component |
| Buddy Section (buddee cards, nudge bar) | Phase 3 | Needs new `GET /api/buddies/dashboard-summary` endpoint |

## Known Issues / Tech Debt

1. **Brag bucket check is too simple** — checks if ANY achievements exist, should check "since last completed review". Needs either a `lastCompletedReviewDate` in stats response or a new lightweight endpoint.
2. **SSR hydration mismatch** on greeting text (server: "Welcome back", client: "Good morning").
3. **GoalProgress shows all active goals** — may want to limit to 3-5 if users have many.
4. **Duplicate Goal interface** — `ReviewCountdown.vue` and `GoalProgress.vue` each define their own local `Goal` interface. Could use shared types from `server/types/index.ts` but those are server-side types not auto-imported on the client.
5. **Old QuickStatCard component not removed** — may be used elsewhere, left in place.

## Reference Files

- **Redesign spec**: `docs/dashboard-redesign-spec.md` (full spec for all phases)
- **Prototype**: `dashboard-prototype.jsx` (React/JSX visual reference, NOT for production use)
- **Phase 1 plan**: `docs/superpowers/plans/2026-04-10-dashboard-redesign-phase1.md`
- **Existing Unovis chart reference**: `app/components/admin/EngagementChart.vue` (pattern to follow for Feedback Pulse in Phase 2)

## Phase 2 Scope (Next)

From the spec, Phase 2 covers:
1. Build `GET /api/dashboard/activity` endpoint (unified recent events feed)
2. Build `GET /api/dashboard/feedback-pulse` endpoint (12-week given/received breakdown)
3. Add `feedbackStreak` to `/api/dashboard/stats` response
4. Implement `ActivityFeed` component
5. Implement `FeedbackPulse` chart component (using Unovis, NOT Recharts)
6. Implement `StreakBadge` component
7. Wire new components into `index.vue` layout
