# Marketing Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed marketing homepage at `jointrellis.app` with hostname-based routing to the product app at `my.jointrellis.app`, including an 8-section page and a working "Book a demo" form.

**Architecture:** Single Nuxt app serves both hostnames. A Nitro server middleware inspects the request host and either renders the marketing pages (apex) or routes through to the existing product (`my.` subdomain). The marketing pages are composed of dedicated components under `app/components/marketing/`. The demo form posts to a new `/api/marketing/demo-request` endpoint that persists a row to a new `demo_requests` table and fires two transactional emails via the existing Resend integration.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI, Drizzle ORM + Postgres, Resend, Zod, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-05-20-marketing-homepage-design.md`

---

## Task 1: Database - add `demo_requests` table

**Files:**
- Modify: `server/database/schema.ts` (append after the `accounts` table around line 455)
- Create: `server/database/migrations/<generated>.sql` (via `npm run db:generate`)

- [ ] **Step 1: Add the table definition to the schema**

Open `server/database/schema.ts`. After the `verifications` table (around line 474), append:

```typescript
// Demo requests from the marketing site
export const demoRequests = pgTable("demo_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  teamSize: text("team_size").notNull(),
  message: text("message"),
  source: text("source").notNull().default("homepage"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate migration**

Run:

```bash
npm run db:generate
```

Expected: drizzle-kit prints a new SQL file under `server/database/migrations/`. Confirm the new file's contents create a `demo_requests` table with the columns above.

- [ ] **Step 3: Apply migration locally**

Run:

```bash
npm run db:migrate
```

Expected: migration applies cleanly. Verify with:

```bash
psql "$DATABASE_URL" -c "\d demo_requests"
```

Expected output shows all 8 columns.

- [ ] **Step 4: Commit**

```bash
git add server/database/schema.ts server/database/migrations/
git commit -m "feat(db): add demo_requests table"
```

---

## Task 2: Email templates for demo requests

**Files:**
- Modify: `server/utils/email.ts` (append two new template functions to the `emailTemplates` object)

- [ ] **Step 1: Add the internal notification template**

In `server/utils/email.ts`, find the `emailTemplates` object and add a new key. Use the existing `invitation` template as a style reference for the HTML structure (sans-serif, max-width 600px, teal `#059669` headings):

```typescript
demoRequestInternal: (data: {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  message: string | null;
}) => `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8"><title>New demo request</title></head>
    <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">New demo request</h1>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
        <p><strong>Company:</strong> ${data.company}</p>
        <p><strong>Team size:</strong> ${data.teamSize}</p>
        <p><strong>Message:</strong></p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px;">
          ${data.message ? data.message.replace(/</g, "&lt;").replace(/\n/g, "<br>") : "<em>No message provided</em>"}
        </p>
      </div>
    </body>
  </html>
`,
```

- [ ] **Step 2: Add the submitter confirmation template**

In the same object, add:

```typescript
demoRequestConfirmation: (name: string) => `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8"><title>Thanks for requesting a Trellis demo</title></head>
    <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Thanks, ${name}.</h1>
        <p>We've received your demo request and will be in touch within one working day to set up a 20-minute walkthrough.</p>
        <p>In the meantime, if you have any questions, just reply to this email.</p>
        <p>- The Trellis team</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Trellis - Peer feedback that grows your team
        </p>
      </div>
    </body>
  </html>
`,
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/email.ts
git commit -m "feat(email): add demo request templates"
```

---

## Task 3: Zod schema for demo request

**Files:**
- Modify: `server/schemas/base.ts` and `server/schemas/api.ts` (follow the existing pattern - inspect first to see how request/response schemas are split)

- [ ] **Step 1: Inspect existing schema patterns**

Read `server/schemas/base.ts` and `server/schemas/api.ts` to understand the structure. Look for an existing example like `CreateAchievementRequestSchema` to mirror.

- [ ] **Step 2: Add the request schema**

In `server/schemas/api.ts` (or wherever request schemas live), add:

```typescript
export const DemoRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Please enter a valid email").max(200),
  company: z.string().min(1, "Company is required").max(100),
  teamSize: z.enum(["just-me", "2-10", "11-50", "51-200", "200+"]),
  message: z.string().max(2000).optional().nullable(),
  // Honeypot - bots fill it, humans don't
  website: z.string().max(0).optional(),
});

export const DemoRequestResponseSchema = z.object({
  ok: z.literal(true),
});
```

Make sure both are exported from `server/schemas/index.ts` (or wherever `apiSchemas` is composed) so they show up on `apiSchemas.DemoRequestSchema`.

- [ ] **Step 3: Commit**

```bash
git add server/schemas/
git commit -m "feat(schemas): add demo request zod schema"
```

---

## Task 4: Rate-limit the demo-request endpoint

**Files:**
- Modify: `server/middleware/rate-limit.ts` (append a new config block to the `rateLimitConfig` array)

- [ ] **Step 1: Add the rate-limit entry**

In `server/middleware/rate-limit.ts`, add a new entry to the `rateLimitConfig` array (after the slack-interactions block):

```typescript
{
  endpoints: ["/api/marketing/demo-request"],
  maxAttempts: 5,
  windowMinutes: 60,
  errorMessage: (remainingTime: number) =>
    `Too many demo requests. Please try again in ${remainingTime} minutes.`,
},
```

- [ ] **Step 2: Commit**

```bash
git add server/middleware/rate-limit.ts
git commit -m "feat(rate-limit): cap demo requests at 5 per hour per ip"
```

---

## Task 5: Demo request API endpoint - tests first

**Files:**
- Create: `server/api/marketing/demo-request.post.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/api/marketing/demo-request.post.test.ts`. Mirror the structure of `server/api/health.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const mockInsert = vi.fn()
const mockReturning = vi.fn()
vi.mock('../../database/connection', () => ({
  db: {
    insert: () => ({ values: () => ({ returning: mockReturning }) }),
  },
}))

const mockSendEmail = vi.fn()
vi.mock('../../utils/email', async () => {
  const actual = await vi.importActual<typeof import('../../utils/email')>('../../utils/email')
  return {
    ...actual,
    sendEmail: mockSendEmail,
  }
})

const { default: handler } = await import('./demo-request.post')

describe('POST /api/marketing/demo-request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([{ id: 'test-uuid' }])
    mockSendEmail.mockResolvedValue({ id: 'email-id' })
  })

  it('accepts a valid submission, inserts a row, and sends two emails', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme',
        teamSize: '11-50',
        message: 'Looking for lighter reviews',
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ ok: true })
    expect(mockReturning).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
  })

  it('rejects a submission with an invalid email', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Jane',
        email: 'not-an-email',
        company: 'Acme',
        teamSize: '11-50',
      },
    })

    await expect(handler(event)).rejects.toThrow()
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it('rejects a submission with a filled honeypot', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Bot',
        email: 'bot@example.com',
        company: 'Bots Inc',
        teamSize: '11-50',
        website: 'http://spam.example',
      },
    })

    await expect(handler(event)).rejects.toThrow()
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it('still returns ok if the confirmation email fails', async () => {
    mockSendEmail
      .mockResolvedValueOnce({ id: 'internal' })
      .mockRejectedValueOnce(new Error('Resend down'))

    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Jane',
        email: 'jane@example.com',
        company: 'Acme',
        teamSize: '2-10',
      },
    })

    const result = await handler(event)
    expect(result).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- server/api/marketing/demo-request.post.test.ts
```

Expected: FAIL with module not found (`./demo-request.post`).

---

## Task 6: Demo request API endpoint - implementation

**Files:**
- Create: `server/api/marketing/demo-request.post.ts`

- [ ] **Step 1: Implement the handler**

Create `server/api/marketing/demo-request.post.ts`:

```typescript
import { db } from "#server/database/connection";
import { demoRequests } from "#server/database/schema";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { sendEmail, emailTemplates } from "#server/utils/email";

const INTERNAL_NOTIFICATION_TO =
  process.env.DEMO_REQUEST_NOTIFY_EMAIL || "alex.bates@pocketworks.co.uk";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, apiSchemas.DemoRequestSchema);

  // Honeypot - any non-empty value is a bot
  if (body.website && body.website.length > 0) {
    throw createError({ statusCode: 400, message: "Invalid submission" });
  }

  const inserted = await db
    .insert(demoRequests)
    .values({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      company: body.company.trim(),
      teamSize: body.teamSize,
      message: body.message?.trim() || null,
    })
    .returning();

  // Fire internal notification (must succeed; we want to know about every lead)
  await sendEmail({
    to: INTERNAL_NOTIFICATION_TO,
    subject: `[Trellis] New demo request from ${body.company}`,
    html: emailTemplates.demoRequestInternal({
      name: body.name,
      email: body.email,
      company: body.company,
      teamSize: body.teamSize,
      message: body.message ?? null,
    }),
  });

  // Confirmation email - non-fatal if it fails
  try {
    await sendEmail({
      to: body.email,
      subject: "Thanks for requesting a Trellis demo",
      html: emailTemplates.demoRequestConfirmation(body.name),
    });
  } catch (err) {
    console.error("Failed to send demo request confirmation email:", err);
  }

  return validateResponse({ ok: true }, apiSchemas.DemoRequestResponseSchema);
});
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
npm run test -- server/api/marketing/demo-request.post.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/api/marketing/ docs/superpowers/plans/
git commit -m "feat(api): add demo-request endpoint"
```

---

## Task 7: Hostname routing middleware - tests

**Files:**
- Create: `server/middleware/hostname.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/middleware/hostname.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const mockSendRedirect = vi.fn()
vi.stubGlobal('sendRedirect', mockSendRedirect)

const { default: handler } = await import('./hostname')

function eventWithHost(host: string, path: string, env: string = 'production') {
  const event = createMockEvent({ path })
  event.node.req.headers.host = host
  process.env.NODE_ENV = env
  return event
}

describe('hostname middleware', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('does nothing in development', async () => {
    const event = eventWithHost('jointrellis.app', '/dashboard', 'development')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('redirects app routes from apex to app subdomain', async () => {
    const event = eventWithHost('jointrellis.app', '/dashboard')
    await handler(event)
    expect(mockSendRedirect).toHaveBeenCalledWith(
      event,
      'https://my.jointrellis.app/dashboard',
      302,
    )
  })

  it('allows the apex root to render marketing page', async () => {
    const event = eventWithHost('jointrellis.app', '/')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('allows the demo-request api on apex', async () => {
    const event = eventWithHost('jointrellis.app', '/api/marketing/demo-request')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('redirects /landing on the app subdomain to apex', async () => {
    const event = eventWithHost('my.jointrellis.app', '/landing')
    await handler(event)
    expect(mockSendRedirect).toHaveBeenCalledWith(
      event,
      'https://jointrellis.app/landing',
      302,
    )
  })

  it('allows app routes on app subdomain', async () => {
    const event = eventWithHost('my.jointrellis.app', '/dashboard')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('handles missing host header gracefully', async () => {
    const event = createMockEvent({ path: '/' })
    delete event.node.req.headers.host
    process.env.NODE_ENV = 'production'
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- server/middleware/hostname.test.ts
```

Expected: FAIL - module not found.

---

## Task 8: Hostname routing middleware - implementation

**Files:**
- Create: `server/middleware/hostname.ts`

- [ ] **Step 1: Implement the middleware**

```typescript
import { defineEventHandler, sendRedirect } from "h3";

const APEX_HOST = "jointrellis.app";
const APP_HOST = "my.jointrellis.app";

// Paths that only make sense on the apex (marketing)
const MARKETING_PATHS = ["/landing"];

// Path prefixes that belong to the product app
const APP_PATH_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/feedback",
  "/goals",
  "/reviews",
  "/buddies",
  "/submit",
  "/notifications",
  "/insights",
  "/brag-bucket",
  "/settings",
  "/admin",
];

function isAppPath(path: string): boolean {
  return APP_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function isMarketingPath(path: string): boolean {
  return MARKETING_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const host = event.node.req.headers.host;
  if (!host) {
    return;
  }

  const path = event.path;

  // API requests are host-agnostic - never redirect
  if (path.startsWith("/api/")) {
    return;
  }

  if (host === APEX_HOST) {
    if (isAppPath(path)) {
      return sendRedirect(event, `https://${APP_HOST}${path}`, 302);
    }
    return;
  }

  if (host === APP_HOST) {
    if (isMarketingPath(path)) {
      return sendRedirect(event, `https://${APEX_HOST}${path}`, 302);
    }
    return;
  }

  // Unknown host - do nothing
});
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
npm run test -- server/middleware/hostname.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/hostname.ts server/middleware/hostname.test.ts
git commit -m "feat(routing): hostname-based marketing/app split"
```

---

## Task 9: Marketing layout

**Files:**
- Create: `app/layouts/marketing.vue`

- [ ] **Step 1: Build the layout**

The product uses an authenticated default layout with the sidebar. Marketing pages need their own bare layout. Create `app/layouts/marketing.vue`:

```vue
<script setup lang="ts">
// No auth, no sidebar - just a dark canvas for marketing pages
</script>

<template>
  <div class="min-h-screen bg-[#0a0f1a] text-white antialiased">
    <slot />
  </div>
</template>

<style>
/* Dot-grid background pattern matching the product UI */
.marketing-dot-grid {
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/layouts/marketing.vue
git commit -m "feat(marketing): add bare dark layout"
```

---

## Task 10: Marketing header component

**Files:**
- Create: `app/components/marketing/MarketingHeader.vue`

- [ ] **Step 1: Build the header**

Create `app/components/marketing/MarketingHeader.vue`:

```vue
<script setup lang="ts">
const { data: session } = useAuth();

const isLoggedIn = computed(() => !!session.value?.user);

const dashUrl = computed(() => {
  if (import.meta.dev) {
    return "/dashboard";
  }
  return "https://my.jointrellis.app";
});

const mobileOpen = ref(false);

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Buddy system", href: "#buddy-system" },
];

function scrollToDemo() {
  document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  mobileOpen.value = false;
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-[#0a0f1a]/80 backdrop-blur border-b border-white/5">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg">
        <span class="text-emerald-400">🌿</span>
        <span>Trellis</span>
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-8 text-sm text-white/70">
        <a v-for="link in navLinks" :key="link.href" :href="link.href" class="hover:text-white transition">
          {{ link.label }}
        </a>
      </nav>

      <div class="hidden md:flex items-center gap-3">
        <template v-if="isLoggedIn">
          <a :href="dashUrl" class="bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md hover:bg-emerald-400 transition">
            Open Trellis →
          </a>
        </template>
        <template v-else>
          <a :href="dashUrl" class="text-sm text-white/70 hover:text-white transition">Log in</a>
          <button
            class="bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md hover:bg-emerald-400 transition text-sm"
            @click="scrollToDemo"
          >
            Book a demo
          </button>
        </template>
      </div>

      <button class="md:hidden text-white" @click="mobileOpen = !mobileOpen" aria-label="Toggle menu">
        <UIcon :name="mobileOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="size-6" />
      </button>
    </div>

    <div v-if="mobileOpen" class="md:hidden border-t border-white/5 px-6 py-4 space-y-3">
      <a v-for="link in navLinks" :key="link.href" :href="link.href" class="block text-white/80" @click="mobileOpen = false">
        {{ link.label }}
      </a>
      <hr class="border-white/10">
      <template v-if="isLoggedIn">
        <a :href="dashUrl" class="block bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md text-center">Open Trellis →</a>
      </template>
      <template v-else>
        <a :href="dashUrl" class="block text-white/70">Log in</a>
        <button class="block w-full bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md" @click="scrollToDemo">
          Book a demo
        </button>
      </template>
    </div>
  </header>
</template>
```

Note: `useAuth()` is the better-auth composable - verify the actual import name in this codebase (`useSession`, `useAuth`, or similar). If it differs, adjust accordingly.

- [ ] **Step 2: Commit**

```bash
git add app/components/marketing/MarketingHeader.vue
git commit -m "feat(marketing): header component"
```

---

## Task 11: Hero section

**Files:**
- Create: `app/components/marketing/HeroSection.vue`
- Asset prep: take a clean screenshot of the dashboard view, save as `public/marketing/hero-dashboard.png` (1600x1000 ideal)

- [ ] **Step 1: Capture the hero screenshot**

Run the app locally, log in as Alex, navigate to the dashboard. Take a clean screenshot (no devtools, browser chrome cropped). Save to:

```
public/marketing/hero-dashboard.png
```

Create the directory if needed:

```bash
mkdir -p public/marketing
```

- [ ] **Step 2: Build the hero component**

```vue
<script setup lang="ts">
function scrollToDemo() {
  document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
}
function scrollToFeatures() {
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <section class="relative overflow-hidden marketing-dot-grid">
    <div class="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          🌿 Peer feedback, every week
        </span>

        <h1 class="mt-6 text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          Better feedback.<br>Stronger teams.
        </h1>

        <p class="mt-6 text-lg text-white/70 max-w-xl">
          A structured, lightweight way for your team to share weekly peer feedback,
          track goals, and grow together, without anyone having to chase it.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <button
            class="bg-emerald-500 text-emerald-950 font-semibold px-6 py-3 rounded-md hover:bg-emerald-400 transition"
            @click="scrollToDemo"
          >
            Book a demo →
          </button>
          <button
            class="text-white border border-white/20 px-6 py-3 rounded-md hover:bg-white/5 transition"
            @click="scrollToFeatures"
          >
            See it in action
          </button>
        </div>

        <p class="mt-8 text-sm text-white/40">
          Built by Pocketworks · Used by teams who care about growth
        </p>
      </div>

      <div class="relative">
        <div class="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" aria-hidden="true" />
        <div class="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl rotate-[-1deg]">
          <img
            src="/marketing/hero-dashboard.png"
            alt="Trellis dashboard showing the next review, recent activity, and feedback pulse chart"
            class="w-full h-auto"
          >
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/marketing/HeroSection.vue public/marketing/
git commit -m "feat(marketing): hero section"
```

---

## Task 12: Problem section

**Files:**
- Create: `app/components/marketing/ProblemSection.vue`

- [ ] **Step 1: Build the component**

```vue
<template>
  <section class="border-t border-white/5">
    <div class="max-w-3xl mx-auto px-6 py-20 text-center">
      <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
        The problem
      </span>
      <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
        Feedback at most companies is broken.
      </h2>
      <p class="mt-6 text-lg text-white/70 leading-relaxed">
        It's annual, awkward, and forgotten by the next quarter. People don't know
        how they're doing until review season, and by then the moment is gone. Trellis
        makes feedback a weekly habit instead of a yearly event, so growth is continuous
        and reviews stop being a surprise.
      </p>

      <div class="mt-12 grid grid-cols-2 gap-6 max-w-xl mx-auto">
        <div class="bg-white/5 rounded-lg p-6 border border-white/10">
          <p class="text-xs uppercase text-white/40 font-semibold mb-3">Most companies</p>
          <div class="flex items-end gap-1 h-20">
            <div v-for="i in 11" :key="i" class="flex-1 bg-white/10 rounded-sm" style="height: 10%" />
            <div class="flex-1 bg-white/30 rounded-sm" style="height: 100%" />
          </div>
          <p class="mt-3 text-sm text-white/60">1 conversation/year</p>
        </div>
        <div class="bg-emerald-500/5 rounded-lg p-6 border border-emerald-500/20">
          <p class="text-xs uppercase text-emerald-300 font-semibold mb-3">With Trellis</p>
          <div class="flex items-end gap-1 h-20">
            <div
              v-for="i in 12"
              :key="i"
              class="flex-1 bg-emerald-400 rounded-sm"
              :style="{ height: (60 + (i * 3)) + '%' }"
            />
          </div>
          <p class="mt-3 text-sm text-emerald-300">52 conversations/year</p>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/marketing/ProblemSection.vue
git commit -m "feat(marketing): problem section"
```

---

## Task 13: Feature showcase (tabbed)

**Files:**
- Create: `app/components/marketing/FeatureShowcase.vue`
- Asset prep: capture 4 product screenshots into `public/marketing/`

- [ ] **Step 1: Capture screenshots**

Capture clean dark-mode screenshots of:
- Submit feedback page → `public/marketing/feature-submit.png`
- Feedback Inbox (Received tab) → `public/marketing/feature-inbox.png`
- Goals page (Active tab) → `public/marketing/feature-goals.png`
- Community Insights → `public/marketing/feature-insights.png`

- [ ] **Step 2: Build the tabbed showcase**

```vue
<script setup lang="ts">
type TabKey = "submit" | "inbox" | "goals" | "insights";

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
  copy: string;
  image: string;
  alt: string;
}

const tabs: Tab[] = [
  {
    key: "submit",
    label: "Submit feedback",
    icon: "i-heroicons-paper-airplane",
    copy: "Give feedback in 90 seconds. Inspiration prompts, character minimums, and a clear 'who you're reviewing' header keep submissions specific and actionable.",
    image: "/marketing/feature-submit.png",
    alt: "Submit feedback form with prompts and tips sidebar",
  },
  {
    key: "inbox",
    label: "Feedback inbox",
    icon: "i-heroicons-inbox",
    copy: "Three views: feedback received, given, and feedback for the people you buddy. Mark as read, star favourites, and publish in bulk when you're ready.",
    image: "/marketing/feature-inbox.png",
    alt: "Feedback inbox with favourites row and recent feedback table",
  },
  {
    key: "goals",
    label: "Goals",
    icon: "i-heroicons-flag",
    copy: "Personal development goals with milestones, deadlines, and progress rings. Connected to the feedback you receive so growth is visible.",
    image: "/marketing/feature-goals.png",
    alt: "Goals page showing active goals with progress rings and milestones",
  },
  {
    key: "insights",
    label: "Community insights",
    icon: "i-heroicons-chart-bar",
    copy: "A living team garden, leaderboards, and participation streaks. Admins see engagement at a glance without anyone feeling surveilled.",
    image: "/marketing/feature-insights.png",
    alt: "Community insights with team activity stats and the Pocketworks garden",
  },
];

const active = ref<TabKey>("submit");
const activeTab = computed(() => tabs.find((t) => t.key === active.value)!);
</script>

<template>
  <section id="features" class="border-t border-white/5">
    <div class="max-w-7xl mx-auto px-6 py-24">
      <div class="text-center max-w-2xl mx-auto">
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          What's inside
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          Everything your team needs to grow together
        </h2>
      </div>

      <div class="mt-12 flex flex-wrap justify-center gap-2" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          :aria-selected="active === tab.key"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border"
          :class="active === tab.key
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'text-white/60 border-white/10 hover:text-white hover:border-white/20'"
          @click="active = tab.key"
        >
          <UIcon :name="tab.icon" class="size-4" />
          {{ tab.label }}
        </button>
      </div>

      <div class="mt-10 rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <div class="grid lg:grid-cols-[260px_1fr]">
          <aside class="hidden lg:block border-r border-white/5 p-6 bg-black/30">
            <div class="text-xs uppercase tracking-wider text-white/40 mb-3">Personal</div>
            <ul class="space-y-1.5 text-sm">
              <li v-for="tab in tabs" :key="tab.key">
                <div
                  class="flex items-center gap-2 px-3 py-2 rounded-md"
                  :class="active === tab.key ? 'bg-emerald-500/10 text-emerald-300' : 'text-white/60'"
                >
                  <UIcon :name="tab.icon" class="size-4" />
                  {{ tab.label }}
                </div>
              </li>
            </ul>
          </aside>

          <div class="p-6 md:p-10">
            <p class="text-white/80 text-lg max-w-2xl">{{ activeTab.copy }}</p>
            <div class="mt-8 rounded-lg overflow-hidden border border-white/10">
              <img :src="activeTab.image" :alt="activeTab.alt" class="w-full h-auto">
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/marketing/FeatureShowcase.vue public/marketing/
git commit -m "feat(marketing): feature showcase with tabbed product screenshots"
```

---

## Task 14: How it works section

**Files:**
- Create: `app/components/marketing/HowItWorks.vue`

- [ ] **Step 1: Build the component**

```vue
<script setup lang="ts">
const steps = [
  {
    title: "Set up your workspace.",
    body: "Drop in a CSV of your team and buddy pairs - roles configured, accounts created, dashboard ready in minutes.",
  },
  {
    title: "Your team signs in with Google.",
    body: "One click - no passwords, no invites to chase. Everyone lands on their personalised dashboard.",
  },
  {
    title: "Feedback becomes a habit.",
    body: "Weekly reminders, a /submit Slack command, and gentle nudges turn feedback into a 90-second ritual.",
  },
];
</script>

<template>
  <section id="how-it-works" class="border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6 py-24">
      <div class="text-center">
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          How it works
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          Up and running in a week.
        </h2>
      </div>

      <div class="mt-14 grid md:grid-cols-3 gap-6">
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="bg-white/[0.02] border border-white/10 rounded-xl p-8"
        >
          <div
            class="size-10 rounded-lg bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold"
          >
            {{ i + 1 }}
          </div>
          <h3 class="mt-5 text-lg font-semibold">{{ step.title }}</h3>
          <p class="mt-2 text-white/60 text-sm leading-relaxed">{{ step.body }}</p>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-white/40">
        Most teams see their first round of feedback within 48 hours of onboarding.
      </p>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/marketing/HowItWorks.vue
git commit -m "feat(marketing): how it works section"
```

---

## Task 15: Buddy system section

**Files:**
- Create: `app/components/marketing/BuddySystem.vue`

- [ ] **Step 1: Build the component**

```vue
<template>
  <section id="buddy-system" class="border-t border-white/5 relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-5 gap-10 items-center">
      <div class="lg:col-span-2">
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          The difference
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          Everyone gets a buddy.
        </h2>
        <div class="mt-6 space-y-4 text-white/70 leading-relaxed">
          <p>
            Most feedback tools collect feedback into a black hole. Trellis pairs every
            person with a buddy who reads, curates, and discusses their feedback with
            them every few months.
          </p>
          <p>
            Buddies aren't managers. They're peers who care about your growth. They see
            the feedback before you do, help turn it into action, and run lightweight
            quarterly reviews that actually move the needle.
          </p>
        </div>
      </div>

      <div class="lg:col-span-3 relative">
        <div class="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" aria-hidden="true" />
        <div class="relative bg-white/[0.03] border border-white/10 rounded-2xl p-10">
          <div class="flex items-center justify-center gap-8">
            <div class="flex flex-col items-center gap-2">
              <div class="size-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-emerald-950 font-bold text-lg">
                A
              </div>
              <span class="text-xs text-white/60">Alex</span>
            </div>
            <div class="h-px flex-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-emerald-400/0" />
            <div class="flex flex-col items-center gap-2">
              <div class="size-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-emerald-950 font-bold text-lg">
                M
              </div>
              <span class="text-xs text-white/60">Matteo (buddy)</span>
            </div>
          </div>

          <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-white/5 rounded-lg p-3 text-center text-white/70 border border-white/10">
              Weekly feedback flows in
            </div>
            <div class="bg-white/5 rounded-lg p-3 text-center text-white/70 border border-white/10">
              Buddy curates and publishes
            </div>
            <div class="bg-white/5 rounded-lg p-3 text-center text-white/70 border border-white/10">
              Quarterly review together
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/marketing/BuddySystem.vue
git commit -m "feat(marketing): buddy system explainer"
```

---

## Task 16: Testimonial section

**Files:**
- Create: `app/components/marketing/TestimonialSection.vue`

- [ ] **Step 1: Build the component**

```vue
<script setup lang="ts">
interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  logo?: string;
}

// PLACEHOLDER: Tobin quote is made up; swap before launch.
const testimonials: Testimonial[] = [
  {
    quote:
      "I used to rely on hallway conversations to know how the team was really getting on. Trellis turned that into something I can see, week by week. Relationships stay healthy, growth is visible, and I'm no longer the bottleneck on knowing what's happening across the team.",
    author: "Tobin Harris",
    role: "Managing Director",
    company: "Pocketworks",
  },
];

const featured = testimonials[0];
</script>

<template>
  <section class="border-t border-white/5 relative overflow-hidden">
    <div class="absolute inset-0 bg-radial-gradient pointer-events-none" aria-hidden="true">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-emerald-500/10 blur-3xl rounded-full" />
    </div>

    <div class="relative max-w-3xl mx-auto px-6 py-24 text-center">
      <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
        Trusted by teams who care about growth
      </span>

      <blockquote class="mt-8 text-xl md:text-2xl text-white/90 leading-relaxed">
        "{{ featured.quote }}"
      </blockquote>

      <div class="mt-8 text-sm text-white/60">
        <span class="font-semibold text-white">{{ featured.author }}</span>,
        {{ featured.role }}, {{ featured.company }}
      </div>

      <div class="mt-12 flex items-center justify-center gap-6 opacity-60">
        <div class="text-sm text-white/40 font-semibold">Pocketworks</div>
      </div>

      <p class="mt-6 text-xs text-white/30">More teams joining soon.</p>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/marketing/TestimonialSection.vue
git commit -m "feat(marketing): testimonial section"
```

---

## Task 17: Demo form component

**Files:**
- Create: `app/components/marketing/DemoForm.vue`

- [ ] **Step 1: Build the form**

```vue
<script setup lang="ts">
const form = reactive({
  name: "",
  email: "",
  company: "",
  teamSize: "11-50" as "just-me" | "2-10" | "11-50" | "51-200" | "200+",
  message: "",
  website: "", // honeypot
});

const submitting = ref(false);
const submitted = ref(false);
const error = ref<string | null>(null);

const teamSizes = [
  { value: "just-me", label: "Just me" },
  { value: "2-10", label: "2-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "200+", label: "200+" },
];

const canSubmit = computed(
  () => form.name.trim() && form.email.trim() && form.company.trim() && !submitting.value
);

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  error.value = null;

  try {
    await $fetch("/api/marketing/demo-request", {
      method: "POST",
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        teamSize: form.teamSize,
        message: form.message.trim() || null,
        website: form.website,
      },
    });
    submitted.value = true;
  } catch (err: any) {
    error.value =
      err?.data?.message ||
      "Something went wrong. Please try again or email alex.bates@pocketworks.co.uk.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section id="demo-form" class="border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12">
      <div>
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          Ready to start?
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          See Trellis in your team.
        </h2>
        <p class="mt-6 text-white/70 leading-relaxed">
          Tell us a bit about your team and we'll set up a 20-minute walkthrough.
          No slide decks, no obligation - we'll show you the product and answer your questions.
        </p>
        <ul class="mt-8 space-y-3 text-sm text-white/70">
          <li class="flex items-start gap-3">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Demo runs on your real org's data if you want</span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Set up your workspace the same week</span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>No card required, no auto-billing</span>
          </li>
        </ul>
      </div>

      <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
        <div v-if="submitted" class="text-center py-12">
          <UIcon name="i-heroicons-check-circle" class="size-16 text-emerald-400 mx-auto" />
          <h3 class="mt-4 text-2xl font-semibold">Got it.</h3>
          <p class="mt-2 text-white/70">We'll be in touch within one working day.</p>
        </div>

        <form v-else class="space-y-4" @submit.prevent="submit">
          <!-- Honeypot - hidden from humans -->
          <div aria-hidden="true" style="position: absolute; left: -9999px;">
            <label>
              Website
              <input v-model="form.website" type="text" tabindex="-1" autocomplete="off">
            </label>
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Your name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Work email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Company</label>
            <input
              v-model="form.company"
              type="text"
              required
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Team size</label>
            <select
              v-model="form.teamSize"
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option v-for="size in teamSizes" :key="size.value" :value="size.value">
                {{ size.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">
              What are you hoping to solve?
              <span class="text-white/30">(optional)</span>
            </label>
            <textarea
              v-model="form.message"
              rows="4"
              placeholder="e.g. our annual reviews are painful, we want something lighter..."
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <p v-if="error" class="text-sm text-red-400" role="alert" aria-live="polite">{{ error }}</p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="w-full bg-emerald-500 text-emerald-950 font-semibold px-4 py-3 rounded-md hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <UIcon v-if="submitting" name="i-heroicons-arrow-path" class="size-4 animate-spin" />
            {{ submitting ? "Sending..." : "Request a demo →" }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/marketing/DemoForm.vue
git commit -m "feat(marketing): demo request form with honeypot"
```

---

## Task 18: Marketing footer

**Files:**
- Create: `app/components/marketing/MarketingFooter.vue`

- [ ] **Step 1: Read package.json to get the version**

The footer needs to display the current version, same as the in-app About section. Check how the in-app version display reads it (likely via `useRuntimeConfig` with a public `version` value, or a direct import from `package.json`). Find the existing pattern:

```bash
grep -rn "package.json\|appVersion\|public.version" app/ nuxt.config.ts | head
```

Reuse that approach for the marketing footer.

- [ ] **Step 2: Build the footer**

```vue
<script setup lang="ts">
const config = useRuntimeConfig();
const version = config.public.appVersion || ""; // adjust to match existing convention
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-white/5">
    <div class="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
      <div>
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg">
          <span class="text-emerald-400">🌿</span>
          <span>Trellis</span>
        </NuxtLink>
        <p class="mt-3 text-sm text-white/50">Peer feedback that grows your team.</p>
        <p class="mt-4 text-xs text-white/30">
          Built by
          <a href="https://pocketworks.co.uk" class="text-white/60 hover:text-white underline" target="_blank" rel="noopener">
            Pocketworks
          </a>
        </p>
      </div>

      <div>
        <h4 class="text-xs uppercase tracking-widest text-white/40 font-semibold">Product</h4>
        <ul class="mt-3 space-y-2 text-sm text-white/60">
          <li><a href="#features" class="hover:text-white">Features</a></li>
          <li><a href="#how-it-works" class="hover:text-white">How it works</a></li>
          <li><a href="#demo-form" class="hover:text-white">Book a demo</a></li>
          <li><a href="https://my.jointrellis.app" class="hover:text-white">Log in</a></li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs uppercase tracking-widest text-white/40 font-semibold">Contact</h4>
        <ul class="mt-3 space-y-2 text-sm text-white/60">
          <li>
            <a href="mailto:hello@jointrellis.app" class="hover:text-white">hello@jointrellis.app</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-white/5">
      <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/40">
        <span>© {{ year }} Pocketworks Mobile Ltd.</span>
        <span v-if="version">v{{ version }}</span>
      </div>
    </div>
  </footer>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/marketing/MarketingFooter.vue
git commit -m "feat(marketing): footer with version"
```

---

## Task 19: Compose the marketing page

**Files:**
- Create: `app/pages/index.vue` (or replace existing if it currently routes the dashboard)
- Confirm: `app/pages/landing.vue` redirects to `/` during the transition

- [ ] **Step 1: Check what currently lives at `/`**

```bash
ls app/pages/
cat app/pages/index.vue 2>/dev/null || echo "no index"
```

If `index.vue` already exists and renders the dashboard, that behaviour needs to stay for the `my.` subdomain. On the apex, the hostname middleware redirects app paths, but `/` itself is what visitors land on. So `index.vue` becomes the marketing page; the existing dashboard at `/` should be moved to `/dashboard` (it's likely already there based on the app screenshots; verify by reading the file).

If the existing `/` is the dashboard, the cleanest path:
- Move its contents to `/dashboard` (already exists per the existing routing in the app) or confirm it's already there.
- Replace `app/pages/index.vue` with the marketing page below.

- [ ] **Step 2: Build the new index.vue**

```vue
<script setup lang="ts">
useHead({
  title: "Trellis - Peer feedback that grows your team",
  meta: [
    {
      name: "description",
      content:
        "Trellis is the peer feedback platform that makes weekly feedback a habit. Track goals, run lightweight reviews, and grow your team together.",
    },
    {
      property: "og:title",
      content: "Trellis - Peer feedback that grows your team",
    },
    {
      property: "og:description",
      content: "Weekly peer feedback, buddy reviews, and goal tracking - in one calm tool.",
    },
    {
      property: "og:image",
      content: "/og-image.png",
    },
    {
      property: "og:url",
      content: "https://jointrellis.app/",
    },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  link: [{ rel: "canonical", href: "https://jointrellis.app/" }],
});

definePageMeta({
  layout: "marketing",
  colorMode: "dark",
  auth: false, // explicit: this page does not require auth
});
</script>

<template>
  <div>
    <MarketingHeader />
    <main>
      <HeroSection />
      <ProblemSection />
      <FeatureShowcase />
      <HowItWorks />
      <BuddySystem />
      <TestimonialSection />
      <DemoForm />
    </main>
    <MarketingFooter />
  </div>
</template>
```

- [ ] **Step 3: Replace `app/pages/landing.vue` with a redirect**

So existing bookmarks still work. Overwrite `app/pages/landing.vue`:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: () => {
    return navigateTo("/", { redirectCode: 301 });
  },
});
</script>

<template></template>
```

- [ ] **Step 4: Verify auto-import works**

The marketing components live in `app/components/marketing/`. Nuxt auto-imports them with the prefix matching the directory by default - confirm by checking `nuxt.config.ts` for any `components` config that might prefix them as `MarketingHeroSection` etc.

If they're auto-imported with the `Marketing` prefix (the default for nested folders), update `index.vue` accordingly:

```vue
<MarketingHero />
<MarketingProblemSection />
<MarketingFeatureShowcase />
<!-- etc -->
```

Run `npm run dev` and visit `/` to verify all sections render without errors.

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue app/pages/landing.vue
git commit -m "feat(marketing): compose homepage at apex root"
```

---

## Task 20: OG image placeholder

**Files:**
- Create: `public/og-image.png` (placeholder)

- [ ] **Step 1: Create a basic OG image**

Quickest path: take a screenshot of the hero section at 1200x630 with the headline visible. Save as `public/og-image.png`.

Refining the OG image with a custom dark-mode design (logo, headline, subtle dot grid) can be done later. Current placeholder just needs to render correctly in link previews.

Verify with a tool like https://www.opengraph.xyz/ once deployed.

- [ ] **Step 2: Commit**

```bash
git add public/og-image.png
git commit -m "chore(marketing): placeholder OG image"
```

---

## Task 21: Robots & sitemap

**Files:**
- Create: `public/robots.txt`
- Optionally: configure Nuxt sitemap module if installed

- [ ] **Step 1: Write robots.txt**

```
User-agent: *
Allow: /

# The product app is auth-gated and has no SEO value
Host: jointrellis.app
Sitemap: https://jointrellis.app/sitemap.xml
```

Note: the `my.jointrellis.app` subdomain shares this codebase. If you want crawlers to ignore the app subdomain, the cleanest option is a small change in `nuxt.config.ts` or a `nitro` route rule that serves different robots content per host. For now, the apex `robots.txt` is enough - the product pages are all auth-gated so crawlers will hit a redirect anyway.

- [ ] **Step 2: Commit**

```bash
git add public/robots.txt
git commit -m "chore(marketing): robots.txt"
```

---

## Task 22: Manual end-to-end test

- [ ] **Step 1: Local smoke test**

```bash
npm run dev
```

In a browser:
- Visit `http://localhost:3000/` - expect marketing page
- Click each anchor link in the header - confirms smooth scroll
- Click each tab in Feature Showcase - confirms screenshots swap
- Submit the demo form with valid data - confirm success card
- Check the demo_requests table: `psql $DATABASE_URL -c "select * from demo_requests order by created_at desc limit 5"`
- Check inbox for the two emails (internal + confirmation)

- [ ] **Step 2: Verify the honeypot blocks bots**

In browser devtools, manually unhide the honeypot field, type a value, submit. Expect a 400 error.

- [ ] **Step 3: Verify rate limit**

Submit 6 times in a row. The 6th should return 429.

- [ ] **Step 4: Verify hostname routing in staging**

After merging to staging and the staging deploy completes:
- Set up `my-staging.jointrellis.app` CNAME (or whatever the staging convention is) pointing at the Railway staging service.
- Visit the apex `jointrellis-staging.up.railway.app/` - expect marketing.
- Visit `jointrellis-staging.up.railway.app/dashboard` - expect redirect to app subdomain.

(Skip if you'd prefer to verify only in production - low risk if local tests pass.)

- [ ] **Step 5: Verify logged-in apex behaviour**

While logged in, visit the apex `/`. Header should show `Open Trellis →` (no Log in, no Book a demo). Form section still renders.

---

## Task 23: DNS & deployment

This is operational, not code, but listed here so it isn't forgotten:

- [ ] **Step 1: Cloudflare DNS - add `dash` subdomain**

In the Cloudflare dashboard for `jointrellis.app`:
- Add CNAME: `dash` → `jz925815.up.railway.app` (same target as the apex)
- Proxy status: Proxied (orange cloud)
- TTL: Auto

- [ ] **Step 2: Railway - add custom domain**

In the Railway service settings:
- Add domain: `my.jointrellis.app`
- Wait for cert provisioning (~1-2 minutes).

- [ ] **Step 3: Update environment variables**

Set on both staging and production Railway services:
- `BETTER_AUTH_URL` should remain pointing at the app subdomain (where the app lives).
- Verify Google OAuth redirect URIs in Google Cloud Console include the app subdomain callback.

- [ ] **Step 4: Update `DEMO_REQUEST_NOTIFY_EMAIL` env var**

If you want the internal demo-request notification to go somewhere other than `alex.bates@pocketworks.co.uk`, set `DEMO_REQUEST_NOTIFY_EMAIL` on the Railway production service.

- [ ] **Step 5: Bump version & PR to staging → main**

Per the deployment workflow in CLAUDE.md:
1. Merge feature branches into `staging`.
2. On staging, run `npm version minor` (this is a feature add).
3. Test on staging URL.
4. Open PR `staging → main`, merge.

---

## Notes for the implementing engineer

- **Em-dashes are forbidden.** All copy in this plan uses hyphens. If you find yourself reaching for a `—`, use a `-` or restructure the sentence.
- **TDD where it earns its keep**: server-side code (Tasks 5, 7) has tests. Vue components don't - they're easier to verify visually with `npm run dev`.
- **Component auto-import**: Nuxt prefixes nested components with the directory name by default. If the codebase has `components/` set with `pathPrefix: false`, names stay flat. Check `nuxt.config.ts` before assuming.
- **Better-auth composable name**: I've used `useAuth()` in the header for the logged-in check, but verify the actual composable name used elsewhere in `app/components/` and adjust.
- **Image assets**: capture from a 1440x900 viewport in production-like conditions so the dashboard chrome doesn't look cramped.
- **The Tobin quote is placeholder**: do not ship without confirming with him or replacing with his actual words.
