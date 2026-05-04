# Feedback Favourites & Modal Redesign

## Context

The Feedback Inbox currently shows a "Recent Feedback" spotlight strip above the table on the Received tab. This strip duplicates the first three rows of the table directly below it (both are sorted newest-first), and its dark gradient cards read poorly in light mode.

The feedback detail modal has the same problem: a dark gradient header banner that was designed for dark mode and clashes with the light theme.

This spec replaces the recent-feedback strip with a curated **Favourites** feature, and redesigns the feedback modal to be theme-neutral.

## Goals

- Remove visual noise that doesn't earn its space (the redundant Recent strip).
- Give users a way to mark feedback worth remembering — for re-reading before 1:1s, performance reviews, or as fodder for the Brag Bucket.
- Make the feedback detail modal work cleanly in both light and dark modes.

## Non-goals

- Favouriting feedback you *gave* (only received feedback can be favourited — the value is "feedback I want to remember about myself").
- A dedicated "Favourites" filter tab on the inbox. The strip is the surface; if a tab is needed later it can be added.
- Promotion of favourites into the Brag Bucket, dashboard widgets, or any cross-feature integration. Those are independent follow-ups.
- Pagination, sort controls, or display caps on the favourites strip. Curation is the user's job.

## Data model

Add one column to the `feedback` table:

```ts
isFavourite: boolean("is_favourite").notNull().default(false),
```

No new index. The existing `reviewee_id` index covers the favourites query, since favourites are filtered client-side from the existing `/received` response (see API section).

**Permission rule:** only the reviewee of a feedback record may toggle its favourite state. Reviewers cannot favourite feedback they gave. Admins do not have a special override (this is personal user state).

## API

### `PATCH /api/feedback/:id/favourite`

Body:

```ts
{ isFavourite: boolean }
```

Behaviour:
- Requires an authenticated session.
- Returns `403` if the session user is not the `reviewee_id` of the feedback record.
- Returns `404` if the feedback id doesn't exist.
- Updates the row and returns the updated record.

### `GET /api/feedback/received`

No new endpoint. The existing handler must include `isFavourite` in its response shape so the client can render the strip and the row star state from the same payload.

The favourites strip is computed client-side by filtering the received list — this avoids a second round-trip and keeps the strip in sync with row-level toggles automatically.

## UI: Received tab

Layout (top to bottom):

1. **Favourites strip** (only renders when `favourites.length > 0`)
2. **Feedback table** (existing behaviour, with one new affordance)

### Favourites strip

- Heading: small uppercase label "Favourites" with a filled star icon, matching the existing "Recent Feedback" heading style.
- Cards: responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), wrapping. No display cap.
- Card surface: matches the Brag Bucket light-mode treatment — `bg-white` with `ring-gray-200` in light, dark unchanged from the current neutral card style. No dark gradient, no decorative blur layers.
- Card content: avatar, reviewer name, role label, relative time (top-right), 2-line content preview.
- Card affordance: filled star icon top-right area; clicking the star unfavourites the item (which removes it from the strip without closing or animating away — just disappears on next render). Clicking elsewhere on the card opens the feedback modal.

### Table star toggle

- New trailing actions column slot. The star button shows on row hover (uses the same hover-reveal pattern as the existing `Mark as Read` action — both live in the actions column).
- Outline star when `isFavourite === false`; filled star when `true`. Filled state stays visible at all times (not hover-gated) so favourited rows are scannable in the table.
- Clicking the star toggles via the API; optimistic UI update with rollback on error.

### Removal of "Recent Feedback" strip

The existing `spotlightFeedback` block in `app/pages/feedback/inbox.vue` (around lines 245–288) is deleted. The computed `spotlightFeedback` and any helpers used only by it are also removed.

## UI: Feedback modal redesign

Replace the dark gradient header banner in `app/components/FeedbackModal.vue` with a theme-neutral header.

Layout:

```
┌────────────────────────────────────────────────────┐
│                                          ☆   ✕    │
│                                                    │
│ FEEDBACK FROM                                      │
│ ╭─╮  Rory                                          │
│ │R│  rory@pocketworks.co.uk                        │
│ ╰─╯                                                │
│ ─────────────────────────────────────────────────  │
│ Submitted Mar 1, 2026  ·  Published Mar 2, 2026    │
│                                                    │
│ ┃ Test coverage has been slipping lately…          │
│                                                    │
│              [Mark as Read]   [Close]              │
└────────────────────────────────────────────────────┘
```

Specifics:
- No background banner element. The modal's own surface is the surface.
- "FEEDBACK FROM" label: small uppercase muted text (`text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400`).
- Avatar size reduced from `xl` to `lg` to match the calmer layout.
- Star toggle button placed in the modal header area, top-right, next to the close button. Reuses the same favourite-toggle behaviour as the table — same API call, same optimistic update.
- Star is only shown when the modal is rendering received feedback (i.e., when the displayed person is the reviewer, not the reviewee). For the "Given" tab, the star is hidden because users can't favourite feedback they gave.
- Keep the primary-coloured left border on the content block — works in both themes and is a nice accent.
- Dates row stays as is (already theme-neutral).

## Component changes

- `server/database/schema.ts` — add `isFavourite` column.
- `server/database/migrations/` — new migration generated via `npm run db:generate`.
- `server/api/feedback/[id]/favourite.patch.ts` — new endpoint.
- `server/api/feedback/received.get.ts` — ensure response includes `isFavourite`.
- `app/types/index.ts` — add `isFavourite: boolean` to feedback type definitions.
- `app/components/FeedbackModal.vue` — header redesign + star toggle.
- `app/components/feedback/FavouriteToggle.vue` (new) — small reusable button for the star, used by both the modal header and the table actions cell. Encapsulates the API call and optimistic update so neither parent has to know about the network shape.
- `app/components/feedback/FavouritesStrip.vue` (new) — strip component that takes a list of favourited feedback and renders the cards. Keeps the inbox page from getting longer.
- `app/pages/feedback/inbox.vue` — delete spotlight block, mount `FavouritesStrip`, add star action column to the received table.

## Testing

- Unit-style: API endpoint returns 403 when caller is not the reviewee.
- Integration: toggling the star from the table updates both the row and (if currently favourited) the strip; toggling from the modal updates both surfaces.
- Visual: modal renders correctly in light and dark modes; favourites strip cards have correct contrast on both themes.
- Regression: the "Given" tab does not show a star (favouriting feedback you gave is not allowed).

## Out-of-scope follow-ups (noted, not built)

- A "Promote to Brag Bucket" action on a favourited feedback item.
- Showing the count of favourites on the dashboard.
- A dedicated favourites filter tab.
- Bulk-favourite from selected rows.
