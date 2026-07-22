# Item #2 Cycle 2 - Onboarding + GDPR + Error UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make first-customer onboarding smooth, meet baseline GDPR expectations (export, self-service deletion, privacy/terms pages), and replace the default error screen with a branded one.

**Architecture:** A reusable invitation util and a reusable "anonymize user" routine underpin the onboarding and deletion work. CSV parsing moves to papaparse. New self-service endpoints and settings UI expose export and deletion. Marketing gains legal pages. `app/error.vue` is upgraded.

**Tech Stack:** Nuxt 4, Nuxt UI, Drizzle ORM, PostgreSQL, better-auth, Resend (email), Vitest, papaparse.

## Global Constraints

- Never add `Co-Authored-By` trailers to commits (project rule).
- Never use em-dashes in prose/comments; use hyphens.
- Tests run with `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run`.
- `users.email` is `NOT NULL UNIQUE`; `users.name` is `NOT NULL`. Deletion must **tombstone** these, not null them.
- Account deletion is **anonymize-and-retain-feedback**. Retain feedback rows (given and received) and reviews; the tombstoned user record provides the anonymization. Delete the user's own artifacts.
- Sole workspace admin cannot delete themselves (self or admin path) without transfer.
- Server endpoint files use explicit imports from `#server/...`.
- Privacy/terms copy is clearly-marked DRAFT pending legal review.

---

## Task 1: Reusable invitation util

Factor the invitation logic (currently inline in `send-invitation.post.ts`) into a util so manual-add and bulk flows share it.

**Files:**
- Create: `server/utils/invitations.ts`
- Modify: `server/api/admin/onboard/send-invitation.post.ts` (call the util)
- Test: `server/utils/invitations.test.ts`

**Interfaces:**
- Produces: `sendUserInvitation(user: { id: string; name: string; email: string }): Promise<void>` - creates a verification token row, builds the set-password URL, sends the invitation email.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'

const { mockDb, mockInsert } = createMockDb()
vi.mock('../database/connection', () => ({ db: mockDb }))
const sendEmail = vi.fn().mockResolvedValue(undefined)
vi.mock('../utils/email', () => ({ sendEmail, emailTemplates: { invitation: (n: string, u: string) => `${n}:${u}` } }))

const { sendUserInvitation } = await import('./invitations')

describe('sendUserInvitation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('creates a verification token and emails the set-password link', async () => {
    mockInsert([])
    await sendUserInvitation({ id: 'u1', name: 'Sam', email: 'sam@acme.com' })
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const arg = sendEmail.mock.calls[0][0]
    expect(arg.to).toBe('sam@acme.com')
    expect(arg.html).toContain('/set-password?token=')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/utils/invitations.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the util (lift the logic from send-invitation.post.ts:62-85)**

```ts
import { db } from "#server/database/connection";
import { verifications } from "#server/database/schema";
import { sendEmail, emailTemplates } from "#server/utils/email";

export async function sendUserInvitation(user: { id: string; name: string; email: string }): Promise<void> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier: user.email,
    value: token,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const setPasswordUrl = `${baseUrl}/set-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  await sendEmail({
    to: user.email,
    subject: "Welcome to Trellis - Set Your Password",
    html: emailTemplates.invitation(user.name, setPasswordUrl),
  });
}
```

- [ ] **Step 4: Refactor send-invitation.post.ts to call it**

Replace the inline token/email block (lines 62-87) with `await sendUserInvitation(user);`. Keep the auth checks, the pre-created-user lookup, and the response.

- [ ] **Step 5: Run tests (util + the endpoint's existing test)**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/utils/invitations.test.ts server/api/admin/onboard/send-invitation.post.test.ts`
Expected: PASS (update the endpoint test if it asserted the inline insert count).

- [ ] **Step 6: Commit**

```bash
git add server/utils/invitations.ts server/utils/invitations.test.ts server/api/admin/onboard/send-invitation.post.ts server/api/admin/onboard/send-invitation.post.test.ts
git commit -m "refactor: extract sendUserInvitation util"
```

---

## Task 2: Auto-send invite on manual single add

**Files:**
- Modify: `server/api/admin/users/index.post.ts` (call `sendUserInvitation` after insert)
- Test: `server/api/admin/users/index.post.test.ts`

- [ ] **Step 1: Update the test to assert an invitation is sent on create**

Mock `sendUserInvitation` and assert it is called once with the new user's id/name/email after a successful create. Keep the existing 401/403/409 and success assertions.

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/users/index.post.test.ts`
Expected: FAIL.

- [ ] **Step 3: Send the invite after create**

Import `sendUserInvitation`. After the insert (line 62) and before building the response, add:

```ts
// Email the invitation immediately for single manual adds.
try {
  await sendUserInvitation({ id: newUser.id, name: newUser.name, email: newUser.email });
} catch (err) {
  console.error("Failed to send invitation on manual add:", err);
}
```

(Non-fatal: the user is still created if email fails; admin can resend from the users page.)

- [ ] **Step 4: Run to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/users/index.post.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/admin/users/index.post.ts server/api/admin/users/index.post.test.ts
git commit -m "feat: email invitation immediately when an admin adds a single user"
```

---

## Task 3: CSV parser via papaparse + role list fix

**Files:**
- Modify: `server/api/admin/onboard/import.post.ts:38-114` (parsing)
- Add dependency: `papaparse` + `@types/papaparse`
- Test: `server/api/admin/onboard/import.post.test.ts` (add quoted-field cases)

- [ ] **Step 1: Install papaparse**

```bash
npm install papaparse && npm install -D @types/papaparse
```

- [ ] **Step 2: Add failing tests for quoted fields / commas-in-values**

Add cases to the import test: a CSV where a name is quoted and contains a comma (e.g. `"Doe, Jane"`), and one with CRLF line endings. Assert the row parses with the full name intact and imports successfully.

- [ ] **Step 3: Run to verify they fail**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/onboard/import.post.test.ts`
Expected: FAIL (naive split mangles the quoted comma).

- [ ] **Step 4: Replace the naive parse with papaparse**

Replace lines 38-114 (`const lines = ...` through the row-build loop). Parse with papaparse in header mode, lower-casing headers, then run the existing per-row validation on `data`:

```ts
import Papa from "papaparse";
// ...
const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim().toLowerCase(),
});

const headerFields = parsed.meta.fields ?? [];
for (const field of ["email", "name"]) {
  if (!headerFields.includes(field)) {
    throw createError({ statusCode: 400, message: `CSV missing required field: ${field}` });
  }
}

const rows: CSVRow[] = [];
const errors: ValidationError[] = [];
parsed.data.forEach((raw, i) => {
  const rowNum = i + 2; // header is row 1
  const email = (raw.email ?? "").trim();
  const name = (raw.name ?? "").trim();
  const roleType = (raw.roletype ?? "").trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { errors.push({ row: rowNum, field: "email", message: `Invalid email format: ${email}` }); return; }
  if (!name) { errors.push({ row: rowNum, field: "name", message: "Name cannot be empty" }); return; }
  if (roleType && !["dev", "design", "qa", "growth", "management"].includes(roleType)) {
    errors.push({ row: rowNum, field: "roleType", message: `Invalid role type: ${roleType}. Must be dev, design, qa, growth, or management` });
    return;
  }
  rows.push({
    email,
    name,
    roleType: roleType || undefined,
    buddyEmail: (raw.buddyemail ?? "").trim() || undefined,
    nextReviewDate: (raw.nextreviewdate ?? "").trim() || undefined,
  });
});
```

Keep the downstream duplicate-check, existing-user check, insert loop, and buddy-assignment code unchanged. (Note: `"management"` is added to the valid roles to match `CLAUDE.md` and the schema; this fixes a pre-existing omission.)

- [ ] **Step 5: Run to verify tests pass**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/onboard/import.post.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx nuxt typecheck
git add package.json package-lock.json server/api/admin/onboard/import.post.ts server/api/admin/onboard/import.post.test.ts
git commit -m "fix: parse onboarding CSV with papaparse (quoted fields, CRLF); allow management role"
```

---

## Task 4: Onboard review-then-send UI + remove Pocketworks wording

**Files:**
- Modify: `app/pages/(admin)/admin/onboard.vue` (add post-import review + "Send invitations"; remove "@pocketworks.co.uk" text)
- Reference: `server/api/admin/onboard/send-bulk-invitations.post.ts` (existing bulk endpoint)

**Interfaces:**
- Consumes: `POST /api/admin/onboard/import` (returns `{ success, rowsImported, errors }`), `POST /api/admin/onboard/send-bulk-invitations`.

- [ ] **Step 1: Remove the Pocketworks-specific copy**

In `onboard.vue`, find the instruction text stating email "Must be @pocketworks.co.uk domain" and replace with domain-neutral guidance ("Any email address is accepted.").

- [ ] **Step 2: Add a review step after a successful import**

After `POST /api/admin/onboard/import` returns, show a result panel: number of users created, a list of the created users (name + email), and any row errors. Add a primary "Send invitations" button (and per-user checkboxes defaulting to all selected) that calls the bulk-invitation endpoint for the selected/created users. Show a success toast on completion.

- [ ] **Step 3: Manually verify the flow**

Run the app (`npm run dev`), import a small CSV, confirm the review panel lists created users and errors, click "Send invitations", confirm the success toast. (No automated component test required; the endpoints are covered server-side.)

- [ ] **Step 4: Commit**

```bash
git add "app/pages/(admin)/admin/onboard.vue"
git commit -m "feat: review-then-send invitations on CSV import; drop Pocketworks-only copy"
```

---

## Task 5: Shared anonymize-user routine + sole-admin guard

**Files:**
- Create: `server/utils/accountDeletion.ts`
- Test: `server/utils/accountDeletion.test.ts`

**Interfaces:**
- Produces:
  - `assertNotSoleAdmin(userId: string, workspaceId: string): Promise<void>` - throws 400 if the user is an admin and the only admin in the workspace.
  - `anonymizeUser(userId: string): Promise<void>` - tombstones the user's PII, deletes their owned artifacts, retains feedback/reviews, nulls buddy pointers, removes auth accounts/sessions.

**What is deleted vs retained (locked):**
- Tombstone on `users`: `name` -> "Deleted user"; `email` -> `deleted-<id>@deleted.invalid`; clear `avatarUrl`, `image`, `bio`, `pronouns`, `preferredName`, `communicationPreferences`; set `emailVerified = false`.
- Delete: `goal_notes` and `goal_milestones` for the user's goals, then `goals`; `buddy_checkins` (userId or buddyId); `achievements`; `notifications`; `feedback_insights` (derived personal analysis).
- Retain: `feedback` (given and received) and `review_schedules` - anonymized via the tombstoned user record.
- Null `users.buddy_id` on anyone whose buddy was the deleted user.
- Remove better-auth `accounts` and `sessions` for the user (logs them out; blocks re-login until re-invited).

- [ ] **Step 1: Write failing tests**

Cover: (a) `anonymizeUser` tombstones name/email and clears profile fields; (b) it deletes goals/checkins/achievements/notifications/insights and the goal children; (c) it does NOT delete feedback; (d) it nulls buddy pointers and removes accounts/sessions; (e) `assertNotSoleAdmin` throws when the user is the only admin, passes when another admin exists or the user is not an admin. Use `createMockDb` and assert the `mockDb.update`/`mockDb.delete` calls.

- [ ] **Step 2: Run to verify they fail**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/utils/accountDeletion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the routine**

```ts
import { db } from "#server/database/connection";
import {
  users, goals, goalMilestones, goalNotes, buddyCheckins,
  achievements, notifications, feedbackInsights, accounts, sessions,
} from "#server/database/schema";
import { eq, or, and, inArray } from "drizzle-orm";

export async function assertNotSoleAdmin(userId: string, workspaceId: string): Promise<void> {
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (target?.role !== "admin") return;
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.workspaceId, workspaceId), eq(users.role, "admin")));
  if (admins.length <= 1) {
    throw createError({
      statusCode: 400,
      message: "You are the only admin in this workspace. Assign another admin before deleting this account.",
    });
  }
}

export async function anonymizeUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Delete goal children, then goals.
    const userGoals = await tx.select({ id: goals.id }).from(goals).where(eq(goals.userId, userId));
    const goalIds = userGoals.map((g) => g.id);
    if (goalIds.length) {
      await tx.delete(goalNotes).where(inArray(goalNotes.goalId, goalIds));
      await tx.delete(goalMilestones).where(inArray(goalMilestones.goalId, goalIds));
    }
    await tx.delete(goals).where(eq(goals.userId, userId));

    // Delete other owned artifacts.
    await tx.delete(buddyCheckins).where(or(eq(buddyCheckins.userId, userId), eq(buddyCheckins.buddyId, userId)));
    await tx.delete(achievements).where(eq(achievements.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(feedbackInsights).where(eq(feedbackInsights.userId, userId));

    // Null buddy pointers to this user.
    await tx.update(users).set({ buddyId: null }).where(eq(users.buddyId, userId));

    // Remove auth records (logs them out).
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));

    // Tombstone the user record.
    await tx.update(users).set({
      name: "Deleted user",
      email: `deleted-${userId}@deleted.invalid`,
      emailVerified: false,
      avatarUrl: null,
      image: null,
      bio: null,
      pronouns: null,
      preferredName: null,
      communicationPreferences: null,
      buddyId: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  });
}
```

(Confirm the `sessions`/`accounts` export names and their `userId` columns against `schema.ts`; adjust if better-auth uses `userId` vs `user_id` mapping. Confirm the profile column names exist.)

- [ ] **Step 4: Run to verify they pass**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/utils/accountDeletion.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx nuxt typecheck
git add server/utils/accountDeletion.ts server/utils/accountDeletion.test.ts
git commit -m "feat: anonymize-user routine and sole-admin guard"
```

---

## Task 6: Admin delete uses anonymize + guard

**Files:**
- Modify: `server/api/admin/users/[id].delete.ts` (replace hard-delete with anonymize)
- Test: `server/api/admin/users/[id].delete.test.ts`

- [ ] **Step 1: Update the test**

Assert the handler calls `assertNotSoleAdmin` and `anonymizeUser` (mock both) rather than issuing raw feedback/goal deletes. Keep the 401/403/404, self-delete-400, and workspace-scoping assertions.

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/users/[id].delete.test.ts`
Expected: FAIL.

- [ ] **Step 3: Replace the deletion body**

Keep auth/admin checks, the self-delete guard (lines 33-39), and the workspace-scoped lookup (lines 41-53). Replace the transaction block (lines 55-94) with:

```ts
await assertNotSoleAdmin(userId, adminWorkspaceId);
await anonymizeUser(userId);
const response = { success: true };
return validateResponse(response, apiSchemas.SuccessResponseSchema);
```

Import both from `#server/utils/accountDeletion`.

- [ ] **Step 4: Run to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/admin/users/[id].delete.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "server/api/admin/users/[id].delete.ts" "server/api/admin/users/[id].delete.test.ts"
git commit -m "feat: admin user removal anonymizes instead of hard-deleting"
```

---

## Task 7: Self-service account deletion endpoint

**Files:**
- Create: `server/api/user/delete-account.post.ts`
- Test: `server/api/user/delete-account.post.test.ts`

**Interfaces:**
- `POST /api/user/delete-account` - deletes the caller's own account (anonymize), guarded against sole-admin.

- [ ] **Step 1: Write failing tests**

Cover: 401 unauthenticated; 400 when the caller is the sole admin (mock `assertNotSoleAdmin` to throw); success path calls `anonymizeUser(session.user.id)` and returns `{ success: true }`.

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/user/delete-account.post.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";
import { assertNotSoleAdmin, anonymizeUser } from "#server/utils/accountDeletion";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const workspaceId = getWorkspaceId(event);
  await assertNotSoleAdmin(session.user.id, workspaceId);
  await anonymizeUser(session.user.id);
  return validateResponse({ success: true }, apiSchemas.SuccessResponseSchema);
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/user/delete-account.post.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/user/delete-account.post.ts server/api/user/delete-account.post.test.ts
git commit -m "feat: self-service account deletion endpoint"
```

---

## Task 8: Data export endpoint

**Files:**
- Create: `server/api/user/export-data.get.ts`
- Test: `server/api/user/export-data.get.test.ts`

**Interfaces:**
- `GET /api/user/export-data` - returns the caller's data as JSON with a `Content-Disposition` attachment header.

- [ ] **Step 1: Write failing tests**

Cover: 401 unauthenticated; success returns an object with keys `profile`, `feedbackGiven`, `feedbackReceived`, `goals`, `reviews`, `checkins`, `achievements`, all scoped to `session.user.id`; the `Content-Disposition` header is set to an attachment filename.

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/user/export-data.get.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { db } from "#server/database/connection";
import { users, feedback, goals, reviewSchedules, buddyCheckins, achievements } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const uid = session.user.id;

  const [profile] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  const feedbackGiven = await db.select().from(feedback).where(eq(feedback.reviewerId, uid));
  const feedbackReceived = await db.select().from(feedback).where(eq(feedback.revieweeId, uid));
  const userGoals = await db.select().from(goals).where(eq(goals.userId, uid));
  const reviews = await db.select().from(reviewSchedules).where(eq(reviewSchedules.userId, uid));
  const checkins = await db.select().from(buddyCheckins).where(eq(buddyCheckins.userId, uid));
  const userAchievements = await db.select().from(achievements).where(eq(achievements.userId, uid));

  setHeader(event, "Content-Type", "application/json");
  setHeader(event, "Content-Disposition", `attachment; filename="trellis-export-${uid}.json"`);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    feedbackGiven,
    feedbackReceived,
    goals: userGoals,
    reviews,
    checkins,
    achievements: userAchievements,
  };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `DATABASE_URL=postgresql://mock:mock@localhost:5432/mock npx vitest run server/api/user/export-data.get.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/user/export-data.get.ts server/api/user/export-data.get.test.ts
git commit -m "feat: self-service data export endpoint"
```

---

## Task 9: Settings Privacy page (export + delete)

**Files:**
- Create: `app/pages/settings/privacy.vue`
- Modify: settings navigation (wherever `general/security/notifications/integrations` tabs are registered) to add "Privacy".

**Interfaces:**
- Consumes: `GET /api/user/export-data`, `POST /api/user/delete-account`.

- [ ] **Step 1: Build the page**

Two cards:
- "Download my data": a button that navigates to / fetches `/api/user/export-data` and triggers a file download.
- "Delete my account": a destructive button opening a confirmation modal (type-to-confirm or explicit confirm). On confirm, `POST /api/user/delete-account`; on success, sign the user out and redirect to `/login`; on 400 (sole admin), show the returned message.

Follow the existing settings page structure/styling (see `app/pages/settings/general.vue`). Use Nuxt UI components (`UButton`, `UModal`, `UCard`) and the app's toast for feedback.

- [ ] **Step 2: Register the nav entry**

Add "Privacy" to the settings tab/nav list next to Security, pointing at `/settings/privacy`.

- [ ] **Step 3: Manually verify**

`npm run dev`: open Settings -> Privacy; download the JSON; open the delete modal, confirm the sole-admin block message with a single-admin account, and the successful deletion + logout with a non-sole account.

- [ ] **Step 4: Commit**

```bash
git add app/pages/settings/privacy.vue
git commit -m "feat: settings privacy page (data export + account deletion)"
```

---

## Task 10: Privacy + terms pages and footer links

**Files:**
- Create: `app/pages/privacy.vue`, `app/pages/terms.vue`
- Modify: `app/components/marketing/MarketingFooter.vue` (add legal links)

- [ ] **Step 1: Build the pages**

Use the marketing layout (`layout: "marketing"`, `auth: false`). Draft copy, clearly headed "DRAFT - pending legal review", covering:
- **Privacy:** what data is collected (account, feedback, goals, reviews) and why; sub-processors (Railway hosting/DB, Resend email, Anthropic AI insights, Plausible analytics); retention; data-subject rights with pointers to Settings -> Privacy (export/erasure); contact `hello@jointrellis.app`.
- **Terms:** service description, acceptable use, disclaimer, liability, contact.

- [ ] **Step 2: Add footer links**

In `MarketingFooter.vue`, add a list group with `<NuxtLink to="/privacy">Privacy</NuxtLink>` and `<NuxtLink to="/terms">Terms</NuxtLink>`.

- [ ] **Step 3: Manually verify**

`npm run dev`: visit `/privacy` and `/terms` (they render in the marketing layout); confirm footer links work.

- [ ] **Step 4: Commit**

```bash
git add app/pages/privacy.vue app/pages/terms.vue app/components/marketing/MarketingFooter.vue
git commit -m "feat: draft privacy and terms pages with footer links"
```

---

## Task 11: Branded error page

**Files:**
- Modify: `app/error.vue`

- [ ] **Step 1: Read the current error.vue**

Confirm what it renders today (97 lines) and reuse its script setup / props (`error` prop of type `NuxtError`).

- [ ] **Step 2: Upgrade the template + logic**

Make it app-styled with status-specific copy: 404 -> "Page not found"; 403 -> "You do not have access"; 500 (and other) -> "Something went wrong". Show the status code, a friendly message, and CTAs: "Back to dashboard" (`clearError({ redirect: '/dashboard' })`) and "Log in" (`/login`). Capture the error to Sentry in `onMounted` via `useNuxtApp().$sentry?.captureException?.(error)` (or the project's existing Sentry accessor). Keep it self-contained and theme-aware.

- [ ] **Step 3: Manually verify**

`npm run dev`: visit a nonexistent route (404 copy + CTA), and confirm a thrown 500 in dev renders the branded page.

- [ ] **Step 4: Commit**

```bash
git add app/error.vue
git commit -m "feat: branded app error page with status-specific copy"
```

---

## Self-Review

- **Spec coverage:** C2.11 -> Tasks 1, 2, 4; C2.12 -> Task 3; C2.13 -> Tasks 5, 6, 7; C2.14 -> Task 8; (settings surface for 13/14 -> Task 9); C2.15 -> Task 10; C2.16 -> Task 11. All six items covered.
- **Type consistency:** `sendUserInvitation`, `assertNotSoleAdmin`, `anonymizeUser` names are used identically across tasks. Endpoints reference the util signatures defined in Tasks 1 and 5.
- **Retain/delete set** for deletion is stated once (Global Constraints + Task 5) and referenced by Tasks 6-7.
- **Confirm-at-implementation flags:** better-auth `sessions`/`accounts` table + column names (Task 5 Step 3); the exact settings-nav registration point (Task 9 Step 2); the project's Sentry client accessor (Task 11 Step 2). Each is called out inline.
- **Open note (not a task):** feedback text authored by others may still contain the deleted user's name in free text; true content-level scrubbing is out of scope for v1 and should be disclosed in the privacy policy (Task 10).
