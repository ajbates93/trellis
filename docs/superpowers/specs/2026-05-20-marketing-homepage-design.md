# Marketing Homepage Design

**Date:** 2026-05-20
**Status:** Draft for review
**Owner:** Alex Bates

## Goal

Build a marketing homepage for Trellis that:

1. Converts prospects (a mix of HR/people-ops leads and founder/eng-manager operators) into demo requests via a single primary CTA.
2. Routes existing users straight to the product at `dash.jointrellis.app`.
3. Replaces the current `/landing` page, which is light-mode and feels disconnected from the dark product UI.

Out of scope for this design: pricing page, blog, customer stories page, self-serve signup flow, multi-tenant workspace UI. Those come later.

## Audience

Balanced across two visitor types:

- **HR / people-ops leads at SMBs** - want context, social proof, depth before booking.
- **Founders / engineering managers at agencies and startups** - want to see the product fast, low marketing fluff.

A single page serves both by letting operators stop scrolling after the feature showcase while giving HR buyers the depth they want further down.

## Decisions made during brainstorming

| Decision | Value |
|----------|-------|
| Visual direction | Full dark theme. No light/dark toggle. |
| Primary CTA | "Book a demo" (form-based, not Calendly). |
| App subdomain | `dash.jointrellis.app` |
| Page structure | 8 sections, standard depth. |
| Theme on logged-in apex visit | Marketing page renders, header shows "Open Trellis" pointing at dash subdomain. |

## Routing & hosts

Two hostnames, one Nuxt app:

- `jointrellis.app` (apex) - marketing site
- `dash.jointrellis.app` - product app

**Implementation:** Nitro server middleware detects `event.node.req.headers.host` and decides behaviour:

- On apex, route `/` renders the marketing page. App routes (`/dashboard`, `/inbox`, `/goals`, `/reviews`, `/feedback`, `/buddies`, `/settings`, `/admin/*`) redirect to the equivalent on `dash.jointrellis.app`.
- On dash subdomain, `/` renders the existing dashboard (auth-gated). Marketing-only routes (`/landing`) redirect to apex.
- Local dev: middleware is a no-op when `NODE_ENV !== 'production'`. The marketing page is reachable at `/landing` locally so devs don't need to fake two hostnames.

**Cost:** negligible. A string compare per request, dominated by SSR cost.

**Cloudflare DNS:** add a `CNAME` `dash` pointing at the same Railway service. Railway will issue certs for both `jointrellis.app` and `dash.jointrellis.app` on the one service.

## Page sections

All sections are dark theme, near-black background (`#0a0f1a`), teal/green accent (`#34d399` family). Section dividers use subtle dot-grid or hairline borders, matching the product UI.

### 1. Header (sticky, ~64px)

- Left: Trellis wordmark + leaf icon (reuse `~/components/ui/Logo.vue` or equivalent).
- Centre nav (desktop only): `Features` · `How it works` · `Buddy system` (anchor links).
- Right (logged-out): `Log in` ghost link to `dash.jointrellis.app` + `Book a demo` filled teal button (anchors to demo form).
- Right (logged-in on apex): single `Open Trellis →` pill to `dash.jointrellis.app`.
- Mobile: nav collapses to a hamburger drawer.

### 2. Hero

Two-column on desktop, stacked on mobile.

**Left (text):**
- Pill: `🌿 Peer feedback, every week`
- H1: **"Better feedback. Stronger teams."**
- Sub: "A structured, lightweight way for your team to share weekly peer feedback, track goals, and grow together, without anyone having to chase it."
- CTAs: `Book a demo →` (primary teal, anchors to form) + `See it in action` (ghost, anchors to feature showcase).
- Trust line: "Built by Pocketworks · Used by teams who care about growth"

**Right (visual):**
- Floating "browser window" with the real Dashboard screenshot (`Good evening, Alex` + Feedback Pulse).
- Subtle teal glow behind it, ambient dot-grid background.
- Three small floating "chips" overlapping corners: a feedback-received card, the streak indicator, and a goals-on-track stat.

### 3. The problem

Centered, max-width ~720px.

- Label: `The problem`
- Headline: "Feedback at most companies is broken."
- Body (~50 words): "It's annual, awkward, and forgotten by the next quarter. People don't know how they're doing until review season, and by then the moment is gone. Trellis makes feedback a weekly habit instead of a yearly event, so growth is continuous and reviews stop being a surprise."
- Visual: small horizontal "before/after" bar chart - left side spike in Q4 ("1 conversation/year"), right side small consistent bars across the year ("52 conversations/year").

### 4. Feature showcase (tabbed)

Borrows the existing `/landing` pattern (sidebar mock + main panel) as a reference, but rebuilt fresh in dark theme. The current `app/components/landing/*.vue` components are light-mode-only and shouldn't be imported directly; treat them as visual prior art rather than reusable units.

- Label: `What's inside`
- Headline: "Everything your team needs to grow together"
- Tab bar: `Submit feedback` · `Feedback inbox` · `Goals` · `Community insights`
- Below tabs: two-column "app frame". Left = mock sidebar with active item highlighted. Right = real product screenshot for the active tab.

**Per-tab copy:**

1. **Submit feedback:** "Give feedback in 90 seconds. Inspiration prompts, character minimums, and a clear 'who you're reviewing' header keep submissions specific and actionable."
2. **Feedback inbox:** "Three views: feedback received, given, and feedback for the people you buddy. Mark as read, star favourites, and publish in bulk when you're ready."
3. **Goals:** "Personal development goals with milestones, deadlines, and progress rings. Connected to the feedback you receive so growth is visible."
4. **Community insights:** "A living team garden, leaderboards, and participation streaks. Admins see engagement at a glance without anyone feeling surveilled."

**Interaction:** tabs swap with a 200ms fade. Mobile: vertical accordion instead of horizontal scroll.

### 5. How it works

Three columns desktop, stacked mobile. Max-width ~1080px.

- Label: `How it works`
- Headline: "Up and running in a week."

**Steps:**

1. **Set up your workspace.** "Drop in a CSV of your team and buddy pairs - roles configured, accounts created, dashboard ready in minutes."
2. **Your team signs in with Google.** "One click - no passwords, no invites to chase. Everyone lands on their personalised dashboard."
3. **Feedback becomes a habit.** "Weekly reminders, a `/submit` Slack command, and gentle nudges turn feedback into a 90-second ritual."

- Footer line: "Most teams see their first round of feedback within 48 hours of onboarding."

Number badges have a subtle teal gradient. No screenshots in this section - it's a breather.

### 6. Buddy system (differentiator)

Asymmetric two-column. Copy left (40%), visual right (60%). Subtle teal glow behind visual.

- Label: `The difference`
- Headline: "Everyone gets a buddy."
- Body:
  - Para 1: "Most feedback tools collect feedback into a black hole. Trellis pairs every person with a buddy who reads, curates, and discusses their feedback with them every few months."
  - Para 2: "Buddies aren't managers. They're peers who care about your growth. They see the feedback before you do, help turn it into action, and run lightweight quarterly reviews that actually move the needle."

**Visual:** relationship card - two avatars connected by a soft teal line, three chips around them:
- "Weekly feedback flows in"
- "Buddy curates and publishes"
- "Quarterly review together"

### 7. Testimonial / social proof

Centered, single column, max-width ~860px. Subtle teal radial gradient.

- Label: `Trusted by teams who care about growth`
- Pull quote:

> "I used to rely on hallway conversations to know how the team was really getting on. Trellis turned that into something I can see, week by week. Relationships stay healthy, growth is visible, and I'm no longer the bottleneck on knowing what's happening across the team."
>
> **Tobin Harris**, Managing Director, Pocketworks

*Note: quote is a placeholder. Replace with Tobin's own words before launch.*

- Below: thin row of customer logos (greyscale, faded). Just Pocketworks for now.
- Footer line: "More teams joining soon."

**Data shape:** testimonials stored as an array of `{ quote, author, role, company, logo }` objects so additions are config-only.

### 8. Book a demo form

Two-column desktop, stacked mobile. Max-width ~1080px.

**Left (copy):**
- Label: `Ready to start?`
- Headline: "See Trellis in your team."
- Body: "Tell us a bit about your team and we'll set up a 20-minute walkthrough. No slide decks, no obligation - we'll show you the product and answer your questions."
- Three reassurance bullets (leaf-tick icons):
  - "Demo runs on your real org's data if you want"
  - "Set up your workspace the same week"
  - "No card required, no auto-billing"

**Right (form, dark card):**

Fields:
1. Your name (text, required)
2. Work email (email, required, validated)
3. Company (text, required)
4. Team size (select: `Just me / 2-10 / 11-50 / 51-200 / 200+`)
5. What are you hoping to solve? (textarea, optional)

Submit button: full-width teal `Request a demo →`. Loading state with spinner. Disabled until name + email + company filled.

### 9. Footer

Simple. Three columns:

- Left: Trellis logo + wordmark, one-line tagline ("Peer feedback that grows your team."), `Built by Pocketworks` link.
- Middle: link list - `Features`, `How it works`, `Book a demo`, `Log in`.
- Right: social/contact - email link, Pocketworks website link.

Bottom strip: `© 2026 Pocketworks Mobile Ltd.` + version (pulled from package.json the same way the in-app About section does).

## Demo request submission

### API route

`POST /api/marketing/demo-request`

**Request body (zod-validated):**

```ts
{
  name: string (1-100 chars),
  email: string (valid email format),
  company: string (1-100 chars),
  teamSize: 'just-me' | '2-10' | '11-50' | '51-200' | '200+',
  message: string (0-2000 chars, optional),
  // Honeypot - rejected if non-empty
  website: string (must be empty)
}
```

**Rate limit:** 5 submissions per IP per hour. Reuse the existing rate-limiting utility if there's one (the feedback submission uses 10/hour - check `server/utils/`). Otherwise add a simple in-memory map with a 1-hour rolling window.

**On success:**

1. Insert row into new `demo_requests` table.
2. Send a transactional email via Resend (already in stack) to `alex.bates@pocketworks.co.uk` with submission details.
3. Send a confirmation email to the submitter: "Thanks - we'll reach out within one working day."
4. Return `{ ok: true }`.

**On client:** replace form with a success card on `200`. Show inline error toast on `4xx/5xx`.

### Database migration

New table `demo_requests`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `name` | text | not null |
| `email` | text | not null, indexed |
| `company` | text | not null |
| `team_size` | text | not null, check constraint on the 5 values |
| `message` | text | nullable |
| `source` | text | default `'homepage'`, future-proofs for other forms |
| `status` | text | default `'new'`, check on `('new', 'contacted', 'demoed', 'converted', 'dropped')` |
| `created_at` | timestamptz | default `now()` |

Generate with `npm run db:generate`, apply with `npm run db:migrate`.

### Email templates

Two Resend templates (or inline HTML strings, matching how existing transactional emails are done in the codebase - check `server/utils/email.ts` or similar):

1. **Internal notification** - to `alex.bates@pocketworks.co.uk`. Subject: `[Trellis] New demo request from {company}`. Body: all submitted fields plus a link to view in admin (when admin view ships).
2. **Submitter confirmation** - to the requester. Subject: `Thanks for requesting a Trellis demo`. Body: warm one-paragraph reply, restates what they submitted, sets expectation of one working day.

## File structure

New / changed files:

```
app/
  pages/
    index.vue                          # NEW (or repurposes existing) - marketing page at apex `/`
    landing.vue                        # KEEP for now as a dev alias of index.vue, remove later
  components/
    marketing/
      MarketingHeader.vue              # NEW
      MarketingFooter.vue              # NEW
      HeroSection.vue                  # NEW
      ProblemSection.vue               # NEW
      FeatureShowcase.vue              # NEW (replaces inline showcase in landing.vue)
      HowItWorks.vue                   # NEW
      BuddySystem.vue                  # NEW
      TestimonialSection.vue           # NEW
      DemoForm.vue                     # NEW
    landing/                           # EXISTING - keep or refactor into marketing/
server/
  middleware/
    hostname.ts                        # NEW - apex vs dash subdomain routing
  api/
    marketing/
      demo-request.post.ts             # NEW
  database/
    schema.ts                          # MODIFY - add `demo_requests`
    migrations/
      000X_demo_requests.sql           # NEW (generated)
  utils/
    email/
      demo-request-internal.ts         # NEW or inline
      demo-request-confirmation.ts     # NEW or inline
```

## SEO & meta

- `<title>`: "Trellis - Peer feedback that grows your team"
- `<meta name="description">`: "Trellis is the peer feedback platform that makes weekly feedback a habit. Track goals, run lightweight reviews, and grow your team together."
- Open Graph image: ~1200x630px, dark background, Trellis logo + headline. Save as `public/og-image.png`.
- `<link rel="canonical">` to `https://jointrellis.app/`.
- Structured data (`application/ld+json`): basic Organization + SoftwareApplication entries.
- Robots: allow indexing on apex, disallow on `dash.` subdomain (already authenticated, no SEO value).

## Accessibility

- All sections semantic - `<header>`, `<main>`, `<section>`, `<footer>`.
- H1 only in hero. H2 per section.
- Tab interaction in feature showcase uses `role="tablist"` / `role="tab"` / `aria-selected`.
- All interactive elements keyboard-focusable with visible focus rings (Trellis app already uses these).
- Colour contrast on dark theme: verify text colours meet WCAG AA against `#0a0f1a`.
- Demo form: labels associated with inputs, validation errors announced via `aria-live`.

## Mobile

- Hero text/visual stack vertically; product mock shrinks but stays the right side / below.
- Feature showcase tabs become a vertical accordion.
- All two-column sections stack to single column at <768px.
- Header nav collapses to a hamburger drawer at <768px.
- Body type stays >=16px, line-height >=1.5.

## Logged-in user behaviour on apex

Detect session in the page setup (same way the dashboard does it).

- Logged out: full marketing page as designed.
- Logged in: same page renders, but `MarketingHeader` shows a single `Open Trellis →` pill (no login or demo CTAs) and the hero's secondary CTA "See it in action" becomes "Open Trellis".
- The demo form section stays visible regardless - a logged-in user might still want to refer a friend's team. (Cheap; no harm in leaving it.)

## Out of scope

Explicit non-goals for this design:

- Pricing page
- Blog or content marketing
- Self-serve signup wizard (workspace creation flow)
- Multiple language support
- Custom OAuth per workspace
- A/B testing infrastructure
- Analytics setup beyond what's already in the app (Sentry is already wired)

## Open questions

None blocking. The Tobin quote is a placeholder pending the real one. The OG image still needs to be designed (can ship initial version with a simple text-on-dark composition and refine later).
