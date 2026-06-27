# Review Templates ("Presets") — Design Spec

**Date:** 2026-06-04

## Problem

Trellis reviews use a single, hardcoded reflection structure: three fixed
questions ("What have I learnt?", "Any highlights?", "Are you worried about
anything?") stored as dedicated columns (`reflectionLearnings`,
`reflectionHighlights`, `reflectionConcerns`) on `review_schedules`. Not every
company runs reviews this way. A prospective customer flagged that a fixed
structure is a blocker to adopting Trellis: a developer review, a QA review and
a designer review may want different reflection prompts.

This is a v1-launch blocker, not a fast-follow.

## Solution

Let admins build named **review templates** ("presets") out of a small, fixed
palette of field types. When a buddy schedules a review they pick a preset; the
reviewee then fills in whatever reflection fields that preset defines. The
current three-question structure ships as a protected **"Default"** template so
nothing changes for users who are happy with it.

Deliberately **not** a generic drag-and-drop form builder. It is a constrained
template builder: a fixed palette, reorder via up/down arrows, no nesting, no
tables, no DnD.

## Approach

### The review, restructured into three tiers

Every review is split into three clearly-separated parts. Only the first is
configurable.

| Tier | Configurable? | Who fills it | Storage |
|------|---------------|--------------|---------|
| **Reflection section** | ✅ via preset | Reviewee | `answers` JSON |
| **Global review score** | ❌ fixed (1–10) | Reviewee (self-rate, optional) | `self_score` column |
| **Buddy comments** | ❌ fixed | Buddy | existing `buddyComments` column |

The global score and buddy comments are permanent fixtures on **every** review
regardless of preset. The global score is fixed and non-configurable **by
design**: keeping its wording and scale constant is what makes it comparable
across reviews, which preserves the option of cross-review analytics later
without contradiction. (For v1 it is just a number an admin can eyeball; no
charts.)

### Field palette (v1)

Three element types only:

| Element | Answer stored? | Config |
|---------|----------------|--------|
| **Long text** | Yes | label, help text, required |
| **Multiple choice** (single-select) | Yes | label, help text, required, options[] |
| **Section header / instructions** | No (pure structure) | label, help text |

Explicitly out of scope for v1: rating elements (the fixed global score covers
the numeric need), tables, checkboxes/multi-select, date fields. All are clean
fast-follows — the snapshot model below accommodates new field types without
migration pain.

## Data Model

### New table `review_templates`

```
id            uuid pk
workspace_id  (scope — follows existing workspace pattern)
name          text                  -- e.g. "Developer"
description   text nullable
is_default    boolean               -- the protected fallback
fields        json                  -- ordered array of field defs (see below)
created_by    text → users.id
created_at    timestamp
updated_at    timestamp
archived_at   timestamp nullable
```

Each entry in `fields`:

```jsonc
{
  "id": "uuid",                                  // stable; answers are keyed by this
  "type": "long_text" | "multiple_choice" | "section",
  "label": "string",
  "helpText": "string?",                         // optional
  "required": true,                              // ignored for type "section"
  "options": ["string", ...]                     // multiple_choice only
}
```

Field order is the array order. Reordering swaps array positions.

### Changes to `review_schedules`

Add:

- `template_id` (uuid, nullable, ref `review_templates.id`) — which preset was chosen.
- `template_snapshot` (json) — **frozen copy** of the template's `fields` at schedule time.
- `answers` (json) — reviewee responses keyed by field `id`, e.g. `{ "<field-uuid>": "<html or option value>" }`.
- `self_score` (int, nullable) — the global 1–10 score.

Keep existing `reflectionLearnings` / `reflectionHighlights` /
`reflectionConcerns` columns **nullable** as a safety net. They are no longer
written to after migration and can be dropped in a later release.

### Why snapshot

The `template_snapshot` is the core idea: each review **owns its own copy** of
the questions. An admin editing the "Developer" preset later has **zero effect**
on reviews already scheduled or completed — they keep rendering from their
snapshot. This solves template versioning structurally, with no version numbers
or drift handling. Editing a template only affects **future** reviews that
snapshot it.

## Migration (one-time, Pocketworks)

1. Seed a **"Default"** template (`is_default = true`) whose `fields` are three
   `long_text` entries matching today's exact questions and order (learnings →
   highlights → concerns).
2. For every existing `review_schedules` row:
   - Set `template_snapshot` to the Default template's `fields`.
   - Copy the three old reflection columns into `answers`, keyed by the
     corresponding Default field ids.
   - Leave `self_score` null (historical reviews never captured one).

Result: a **single rendering path** for all reviews, old and new — everything
renders from `template_snapshot` + `answers`.

Because this is currently a single small workspace, the migration is cheap and
low-risk.

## Reporting impact

Minimal. Existing reports aggregate feedback counts and engagement, not the
*content* of reflection fields. Confirm during implementation that nothing reads
`reflectionLearnings` / `reflectionHighlights` / `reflectionConcerns` directly;
expectation is that nothing does.

## Admin Builder UI

New admin page: **Review Templates** (under the existing `(admin)/admin`
section, `"default"` layout, `UDashboardPanel` like the other admin pages).

- **List view**: presets with create / edit / **duplicate** / archive actions.
  The Default template can be edited but **not deleted or archived** — there
  must always be a fallback.
- **Editor**: a vertical list of fields.
  - "+ Add field" menu → Long text / Multiple choice / Section.
  - Per field: edit label + help text, toggle required (n/a for Section), and
    for multiple choice add/remove/edit options.
  - Reorder with **up/down arrows** (no drag-and-drop).
- Preset management is **admin-only**.

## Scheduling & Filling

- **Scheduling** (buddy): the create-review flow gains a **preset dropdown**,
  defaulting to "Default". On save, the chosen template's `fields` are copied
  into `template_snapshot` on the new review. The buddy picks a preset as-is —
  no per-review one-off edits to the fields in v1.
  - If no preset is chosen / available, fall back to the Default template's snapshot.
- **Reviewee's review page**: renders dynamically from `template_snapshot`:
  - `long_text` → TipTap rich-text editor
  - `multiple_choice` → radio/select of `options`
  - `section` → heading + optional help text, no input
  - plus the fixed **1–10 self-score** control.
  - Responses save to the `answers` JSON, keyed by field id.
- **Buddy's view**: the same rendered reflections (as today's read/review flow)
  plus their fixed comment box, unchanged.

## Micro-decisions (locked)

- Global score scale: **1–10**.
- Buddy **cannot** tweak a preset at schedule time — picks one as-is.
- Preset management is **admin-only**.
- Per-field **`required`** flag included.

## Out of Scope (v1)

Rating elements, tables, checkboxes, date fields, drag-and-drop, role-linked /
auto-suggested presets, per-review one-off preset edits, configurable
buddy/score sections, cross-review analytics dashboards. The snapshot data model
accommodates all of these as later additions without migration pain.
