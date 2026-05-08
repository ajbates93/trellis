# Notifications — Design Spec

**Date:** 2026-05-08
**Branch:** `feat/notifications`

## Goal

Introduce in-app notifications to Trellis: a per-user event log surfaced via a sidebar bell with a count badge, a popover, and a dedicated inbox page. Notifications complement the existing email channel rather than replace it.

## Scope (v1)

### Event types

| Type | Recipient | Trigger |
|---|---|---|
| `feedback_received` | reviewee | feedback published to them |
| `buddy_feedback_received` | reviewee's buddy | feedback published about their buddy |
| `review_created` | the other party | buddy schedules a review |
| `review_rescheduled` | the other party | scheduled date changes |
| `review_cancelled` | the other party | review cancelled |
| `review_completed` | the other party | review marked completed |
| `review_reminder` | both parties | existing reminder cron |
| `goal_approaching` | goal owner | `target_date = today + 7 days`, status active |
| `goal_overdue` | goal owner | `target_date < today`, status active, fires once per goal |

### Out of scope (deferred)

- Real-time push (SSE / WebSockets)
- Notification aggregation / grouping
- Auto-delete / retention policy (current decision: keep forever)
- Admin/workspace announcements
- Achievement notifications
- Buddy-assignment-change notifications
- `workspace_id` column (consistent with feedback/goals/reviews — added in Phase 11 multi-tenancy migration if needed)
- Weekly email digest
- User-controllable in-app channel (always on in v1)

## Architecture

### Data model

New table `notifications`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `users.id` ON DELETE CASCADE | recipient |
| `type` | text | values from the list above |
| `title` | text | rendered at emission time, e.g. `"New feedback from Alex"` |
| `body` | text nullable | optional secondary line |
| `link` | text | in-app deep link, e.g. `/feedback/inbox`, `/reviews/{id}` |
| `metadata` | jsonb | structured payload (`actorId`, `feedbackId`, `reviewId`, `goalId`, etc.) |
| `read_at` | timestamp nullable | `null` = unread |
| `created_at` | timestamp default `now()` | |

Indexes:
- `(user_id, read_at)` — unread-count query
- `(user_id, created_at desc)` — inbox listing

`type` is a TypeScript string union, not a Postgres enum, so new types can be added without DB migrations.

### Emission helper

`server/utils/inAppNotifications.ts`:

```ts
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link: string;
  metadata?: Record<string, unknown>;
}): Promise<void>;
```

- Fire-and-forget: catches and logs errors, never throws (matches `notifyBuddyOfNewFeedback` style in `server/utils/notifications.ts`).
- Title/body are pre-rendered strings — snapshot semantics, no client-side templates, no i18n machinery.

### Emission points

| Type | File |
|---|---|
| `feedback_received`, `buddy_feedback_received` | `server/api/feedback/[id]/publish.patch.ts`, `server/api/feedback/publish-batch.post.ts` |
| `review_created` | review create endpoint (`server/api/reviews/...`) |
| `review_rescheduled` | review update endpoint when `scheduled_date` changes |
| `review_cancelled` | review delete / status→cancelled endpoint |
| `review_completed` | review status→completed endpoint |
| `review_reminder` | `server/tasks/review-reminders.ts` (existing cron) |
| `goal_approaching`, `goal_overdue` | `server/tasks/goal-reminders.ts` (new daily cron) |

### Idempotency

- `goal_overdue` checks for an existing notification with matching `metadata->>'goalId'` and skips if found. Prevents daily duplication.
- `goal_approaching` fires only on the exact day `target_date = today + 7 days` — natural one-shot.
- All other types fire on discrete state transitions and don't need explicit idempotency.

### Email parity

The new email side covers review create/reschedule/cancel/complete, matching the existing review-reminder email style. Templates added to `server/utils/email.ts`.

The existing `users.emailNotifications` boolean is replaced by a `users.email_notification_preferences` `jsonb` column (default `{}` = all on). A new helper `shouldEmail(userId, category)` checks per-category opt-out. Migration: existing `false` → all keys false; existing `true` → empty object.

Goal events are **in-app only** (no email).

### API endpoints

All under `server/api/notifications/`, all session-protected, scoped to `session.user.id`.

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/notifications` | List for current user. Query: `limit` (default 20, max 50), `cursor` (created_at), `filter` (`all` \| `unread`). Returns `{ items, nextCursor }`. |
| `GET` | `/api/notifications/unread-count` | `{ count }` for the bell badge. |
| `PATCH` | `/api/notifications/:id/read` | Sets `read_at = now()` if null. Idempotent. |
| `POST` | `/api/notifications/mark-all-read` | Bulk-marks all unread for current user. |

No delete endpoint in v1.

### Polling / freshness

Per Q2 (option B): the client only fetches `unread-count` on route change and on popover open. No background polling, no SSE/WS. The popover fetches `/api/notifications?limit=10` on open.

## UI

### Sidebar (`SidebarNavigation.vue`)

- New "Notifications" entry directly below Dashboard.
- Bell icon + label + count badge on the right (hidden when 0; shows `9+` when > 9).
- Clicking the row opens a popover anchored to the row (does NOT navigate).
- Mobile menu still includes a "Notifications" link that routes to the inbox page.

### Popover (`NotificationsPopover.vue`)

- Header: "Notifications" + "Mark all read" link (visible only when unread count ≥ 1).
- Tabs: "All" | "Unread".
- Body: up to 10 most recent rows: type icon + title + relative time + unread dot.
- Empty state.
- Footer: "See all" → `/notifications`.
- Row click: PATCH `/:id/read` (fire-and-forget) and navigate to `notification.link`.

### Mobile bell

The existing mobile header gets a bell icon with the same count badge. Tapping opens the same popover content as a sheet/drawer.

### Inbox page (`app/pages/notifications.vue`)

- Same row UI as popover, full-width, cursor-paginated.
- Tabs: "All" | "Unread".
- Action bar: "Mark all read".
- Empty state.

### Icon mapping

- `feedback_received`, `buddy_feedback_received` → message-square
- `review_*` → calendar
- `goal_*` → target

### Composable (`app/composables/useNotifications.ts`)

Caches the last fetched unread count and the most recent items; exposes `refreshCount()` (called on route change + popover open), `markRead(id)`, `markAllRead()`, `fetchPage(cursor)`.

## Settings

`app/pages/settings/notifications.vue` is restructured into a two-column layout: **In-app** | **Email**, one row per category.

- In-app column: lock/check icon, non-toggleable in v1.
- Email column: per-category toggle, defaulting to on.

Categories listed (one row each):

- Feedback received
- Feedback for someone you buddy
- Review scheduled by buddy *(new email)*
- Review rescheduled *(new email)*
- Review cancelled *(new email)*
- Review completed
- Review reminders
- Goal approaching target *(in-app only — column shows "—")*
- Goal overdue *(in-app only — column shows "—")*

Backed by `users.email_notification_preferences` (jsonb).

## Read state & retention

- Click a notification → marks read + navigates to `link`.
- "Mark all read" button in popover and inbox page.
- Notifications kept indefinitely. Auto-delete deferred; will revisit if the table grows.

## Testing

Following existing patterns (colocated `*.test.ts` and `server/__tests__/`):

- `createNotification` helper: happy path, error swallowing.
- `shouldEmail` helper: default on, explicit off, missing key.
- 4 API endpoint tests: auth, user scoping, pagination, idempotent mark-read.
- Updates to `publish.patch.test.ts` and `publish-batch.post.test.ts` to assert in-app emissions.
- New tests for review create/reschedule/cancel/complete handlers (in-app + email).
- Cron task tests: mock current date, assert emissions for `goal_approaching` (exact-day match) and `goal_overdue` (idempotency by goalId).

## Files touched (rough)

**New:**
- `server/database/migrations/<n>_notifications.sql` (+ schema updates)
- `server/utils/inAppNotifications.ts`
- `server/utils/emailPreferences.ts` (`shouldEmail` helper)
- `server/api/notifications/index.get.ts`
- `server/api/notifications/unread-count.get.ts`
- `server/api/notifications/[id]/read.patch.ts`
- `server/api/notifications/mark-all-read.post.ts`
- `server/tasks/goal-reminders.ts`
- `app/components/NotificationsPopover.vue`
- `app/pages/notifications.vue`
- `app/composables/useNotifications.ts`
- 4 new email templates in `server/utils/email.ts` (review created/rescheduled/cancelled/completed)
- Tests for all of the above

**Modified:**
- `server/database/schema.ts` (+ `notifications` table; replace `emailNotifications` with `email_notification_preferences`)
- `app/components/SidebarNavigation.vue`
- `app/pages/settings/notifications.vue`
- `server/api/feedback/[id]/publish.patch.ts`
- `server/api/feedback/publish-batch.post.ts`
- review CRUD endpoints (create / update / status change)
- `server/tasks/review-reminders.ts` (also emit in-app)
- `server/utils/notifications.ts` (use `shouldEmail`)
- `nuxt.config.ts` (register goal-reminders cron)
