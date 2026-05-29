# Demo Environment - Design Spec

**Date:** 2026-05-29
**Status:** Approved (design), pending implementation plan
**Author:** Alex Bates (with Claude)

## Purpose

Provide a self-contained demo environment for Trellis so prospects (typically HR
admins or CEOs reached via the marketing site's contact form) can be shown the
product during a live demo **and** be given a link to explore it unsupervised
afterwards. The demo must look and behave like the real product, but must never
send real emails or touch real customer data, and must be resettable to a clean
state.

## Goals

- Mirror the real product (deploys from `main`).
- Zero outbound side effects (no emails, no real integrations).
- Frictionless access: one click to enter, no Google OAuth or invitation step.
- Resettable: nightly automatic reset plus an on-demand manual reset.
- Realistic, "alive"-looking seed data so dashboards, charts, leaderboards and
  AI insights are populated.

## Non-Goals (explicitly out of scope)

- Billing / Stripe (separate future cycle).
- Multi-tenancy isolation hardening (separate future cycle; a prerequisite for
  onboarding real paying external orgs, but not for this single-tenant demo).
- A long-lived `demo` git branch. The demo runs the same `main` code as
  production, differentiated only by an environment flag.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Usage mode | Both supervised (live demo) and self-serve (unsupervised link) |
| Login model | Single admin account, one-click entry |
| Deploy source | `main` (mirrors production) |
| Email | Disabled in demo mode |
| AI insights | **Left live** (real Anthropic calls; a feature worth showing) |
| Banner | Persistent "demo environment" banner |
| Root route | `/` redirects to demo login (not the marketing homepage) |
| Integrations | Slack connect and future billing/Stripe settings hidden |
| Reset | Nightly automatic + manual on-demand |
| Seed data | ~20-person fictional company ("Northwind Studios") |
| Demo URL | Railway-generated domain for now |

## Architecture

The demo is the **same codebase as production**, deployed to a separate Railway
service against a separate database, with behaviour driven by a single
`DEMO_MODE` environment flag. There is no code fork and no demo branch.

### 1. Infrastructure (Railway + CI)

- New Railway service (e.g. `trellis-demo`) with its **own PostgreSQL database**.
  The demo database must never be the staging or production database.
- Deploys from `main`, so the demo always reflects the released product.
- New GitHub Actions workflow `deploy-demo.yml`, triggered on push to `main`
  (alongside the production deploy):
  1. Run database migrations against the demo DB.
  2. Seed the demo DB **only if it is empty** (first-time provisioning).
  - Ongoing data freshness is handled by the nightly reset, not by redeploys, so
    a deploy does not clobber an in-progress demo unless the DB was empty.
- Demo URL: the Railway-generated domain for now (a custom `demo.` subdomain can
  be added later without code changes).

#### Demo environment variables

- `DEMO_MODE=true`
- `DATABASE_URL` - the demo database (separate from staging/prod)
- `BETTER_AUTH_SECRET` - unique to demo
- `BETTER_AUTH_URL` - the demo domain
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - present but effectively unused
- `RESEND_API_KEY` - present but all sends are gated off by `DEMO_MODE`
- `ANTHROPIC_API_KEY` - required; AI insights stay live
- `DEMO_RESET_SECRET` - guards the manual reset endpoint

### 2. The `DEMO_MODE` flag

Added to `nuxt.config.ts` runtime config:
- Private (`runtimeConfig.demoMode`) for server-side logic.
- Public (`runtimeConfig.public.demoMode`) for UI conditionals.

A single switch drives all demo behaviour, so the identical `main` code runs in
every environment. It controls email suppression, one-click login, the
banner/redirect/hidden integrations, and enabling the reset endpoint.

### 3. Email suppression (single chokepoint)

All application email already flows through `sendEmail()` in
`server/utils/email.ts`. Add a guard at the top of that function: when
`demoMode` is true, log the intended send and return early without calling
Resend. This single guard covers every email path in the app, including the
scheduled review-reminder and goal-reminder cron tasks.

### 4. One-click admin login

- A demo-only entry page (the redirected `/`, or `/demo`) presenting a single
  "Enter the demo" button.
- Button calls `POST /api/demo/login`. This endpoint returns 404 unless
  `demoMode` is true.
- The endpoint signs in the seeded admin **server-side** via better-auth's
  `signInEmail` API using the seeded admin's known demo credentials, and sets
  the session cookie. No Google OAuth, no invitation hook friction.
  - (Email/password auth is already enabled in `server/utils/auth.ts`, so the
    seeded admin simply has a known demo password.)
- The seeded admin is a normal admin user, so a single login exposes both the
  admin panel and the regular employee experience (their own dashboard,
  feedback, goals, buddy).

### 5. Reset (nightly + manual)

- A reusable `seedDemo()` routine (a demo-specific variant of the existing
  `server/database/reset.ts` / seed) that:
  1. **Refuses to run unless `DEMO_MODE` is true** (hard guard so it can never
     wipe staging/production).
  2. Truncates the application data tables.
  3. Re-seeds the fictional company (see §6).
- **Manual reset:** `POST /api/demo/reset`, guarded by `demoMode` plus
  `DEMO_RESET_SECRET` (and/or a super-admin session). Used for a clean slate
  immediately before a live demo.
- **Nightly reset:** a scheduled task (the app already uses Nuxt
  `scheduledTasks` in `nuxt.config.ts`) that calls the same routine, so
  unsupervised wear-and-tear self-heals overnight. The task is a no-op unless
  `demoMode` is true.

### 6. UI behaviour in demo mode

Driven by the public `demoMode` flag:
- **Persistent banner:** an app-wide banner reading "Demo environment - data
  resets regularly."
- **Root redirect:** `/` routes to the demo login instead of the marketing
  homepage.
- **Hidden integrations:** Slack connect and (future) billing/Stripe settings
  are hidden in the admin/settings UI.

### 7. Seed data: ~20-person fictional company

"Northwind Studios" (~20 employees), designed to look alive:
- ~20 users spanning the role types (dev/design/qa/growth/management).
- Buddy pairings across the team.
- A few months of feedback history, mixing published feedback and drafts.
- Active and completed goals, with milestones and notes.
- Past completed reviews plus upcoming scheduled reviews (so dashboards and
  charts are populated).
- Achievements (brag bucket) entries.
- Enough feedback volume per user for the live AI insights to generate.
- The admin persona you log in as is fully populated as an employee too (own
  buddy, feedback, goals), so the personal experience is not empty.

## Safety Considerations

- **No accidental prod wipe:** the reset routine and reset endpoint both hard-
  refuse unless `DEMO_MODE` is true.
- **No real emails:** suppressed at the single `sendEmail()` chokepoint, so new
  email call sites are covered automatically.
- **Isolated data:** separate Railway database; never pointed at staging/prod.
- **Demo login locked to demo:** `/api/demo/login` and `/api/demo/reset` return
  404 / refuse outside demo mode.

## Affected / New Files (indicative)

- `nuxt.config.ts` - add `demoMode` to runtime config (private + public).
- `server/utils/email.ts` - email suppression guard.
- `server/api/demo/login.post.ts` - one-click admin login (demo-only).
- `server/api/demo/reset.post.ts` - manual reset (demo-only, secret-guarded).
- `server/database/seed-demo.ts` (or equivalent) - `seedDemo()` routine with the
  `DEMO_MODE` guard and the Northwind Studios fixture.
- Nuxt `scheduledTasks` entry + handler for the nightly reset.
- Demo login page (redirected `/` or `/demo`).
- App-wide demo banner component + conditional rendering.
- Root redirect logic (middleware or index page) when `demoMode`.
- Conditional hiding of Slack/billing settings UI.
- `.github/workflows/deploy-demo.yml` - demo deploy + first-time seed.
- `.env.example` - document the demo env vars.

## Open Items (deferred, not blocking)

- Exact demo hostname (using Railway-generated domain for now).
- Whether to later add a custom `demo.` subdomain.
