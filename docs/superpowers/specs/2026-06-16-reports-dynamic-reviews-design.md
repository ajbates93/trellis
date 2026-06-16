# Admin Reports under dynamic review templates

## Problem

Reviews now snapshot an arbitrary template (`templateSnapshot` + `answers`)
rather than the fixed three reflection columns. The admin Reports page
(`app/pages/(admin)/admin/reports.vue`) already renders each review's snapshot
fields correctly in a per-review accordion, with a legacy fallback for reviews
that predate the snapshot.

The one stale piece is the **Review Breakdown filter** ("All Reflections /
Learnings / Highlights / Concerns"). It is hardcoded to the old default
template's three field ids (`reflectionFilterOptions` + `DEFAULT_FIELD_IDS`).
For any review built from a custom template (e.g. the "Designers" template),
those options match nothing, so the filter is misleading or broken.

Separately, the self-score captured on each review (1-10) is not surfaced in
Reports at all.

## Decision

Admins use the Review Breakdown to **read one person's review answers**, not to
slice a theme across reviews. The per-review accordion is therefore the right
structure, and the fixed-category filter is the part fighting the dynamic
model. We remove the filter and surface the self-score.

This is a **client-only change** to `app/pages/(admin)/admin/reports.vue`. No
API or schema changes: `GET /api/reviews/past` already returns
`templateSnapshot`, `answers`, and `selfScore`.

## Changes

### Remove the fixed filter

Delete the filter dropdown in the Review Breakdown header and its now-unused
supporting code:

- the `USelectMenu` bound to `selectedReflectionType`
- `reflectionFilterOptions`
- `selectedReflectionType`
- `selectedFilterValue`
- `DEFAULT_FIELD_IDS`
- the `entriesFor(review, filterValue)` helper

Keep `reviewReflectionEntries(review)` unchanged — it derives the non-empty
reflection entries from `templateSnapshot` + `answers`, with the legacy
three-column fallback for snapshot-less reviews.

### Review Breakdown rendering

- Show an accordion of completed reviews, one item per review.
- A review appears if it has at least one reflection entry **or** a non-null
  `selfScore`.
- Each accordion body renders the review's reflection entries with their real
  field labels: `long_text` as sanitized HTML, other types as plain text
  (unchanged from today).
- Each accordion body also shows the self-score when present, e.g. a
  `Self-score: 7 / 10` line. Render nothing for self-score when it is null.
- If a shown review somehow has a self-score but no reflection entries, the
  entries area shows the existing "No reflections recorded" note.

### Empty states

- Keep "No completed reviews found for this user." when there are no completed
  reviews.
- Keep the "No reflections recorded for this user." state, but widen its
  condition so a review carrying only a self-score still surfaces (i.e. the
  "nothing to show" state only applies when no completed review has either a
  reflection entry or a self-score).

## Out of scope

- Buddy comments and completion summary in Reports (the full-review-picture
  option was not chosen).
- Any cross-review filtering or aggregate analytics (self-score trends,
  sentiment, etc.).
- Server or schema changes.

## Verification

- Load Reports as an admin for a user with a completed custom-template review
  (e.g. Marcin's June 2026 "Designers" review): the review's fields render with
  their real labels, the self-score shows, there is no filter dropdown, and
  there are no console errors.
- A user with a completed default-template (or legacy) review still renders its
  reflections correctly.
- `npx eslint` passes on the changed file; full test suite stays green.
