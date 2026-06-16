# Review Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins build named review "presets" from a fixed palette of field types (long text, multiple choice, section header); buddies pick a preset when scheduling, and the reviewee fills the resulting dynamic reflection form plus a fixed 1–10 self-score.

**Architecture:** A new `review_templates` table stores ordered field definitions as JSON. When a review is scheduled, the chosen template's fields are **snapshotted** onto the `review_schedules` row (`template_snapshot`), so editing a template never disturbs existing reviews. Reviewee answers live in an `answers` JSON column keyed by field id; the global score lives in a fixed `self_score` column. Today's three-question structure ships as a protected "Default" template, and existing reviews are migrated into the snapshot+answers shape so there is a single rendering path.

**Tech Stack:** Nuxt 4 (SSR), Drizzle ORM + PostgreSQL, Zod validation, Nuxt UI v4, TipTap (existing `ReflectionEditor`), Vitest (server-side unit tests, happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-04-review-templates-design.md`

---

## File Structure

**Create:**
- `server/schemas/reviewTemplates.ts` — Zod schemas for a template field + CRUD request bodies; inferred `ReviewTemplateField` type.
- `server/utils/reviewTemplates.ts` — pure logic: stable default field ids, `DEFAULT_TEMPLATE_FIELDS`, `buildSnapshot()`, `validateAnswers()`.
- `server/utils/reviewTemplates.test.ts` — unit tests for the util.
- `server/schemas/reviewTemplates.test.ts` — unit tests for the field schema.
- `server/api/admin/review-templates/index.get.ts` — list templates.
- `server/api/admin/review-templates/index.post.ts` — create template.
- `server/api/admin/review-templates/[id]/index.get.ts` — get one template.
- `server/api/admin/review-templates/[id]/index.patch.ts` — update template.
- `server/api/admin/review-templates/[id]/index.delete.ts` — archive template.
- `server/api/admin/review-templates/[id]/duplicate.post.ts` — duplicate template.
- `server/api/admin/review-templates/index.post.test.ts` — endpoint validation tests.
- `server/database/scripts/seed-review-templates.ts` — one-time migration: create Default template per workspace + backfill existing reviews.
- `app/pages/(admin)/admin/review-templates/index.vue` — admin list page.
- `app/pages/(admin)/admin/review-templates/[id].vue` — admin builder/editor page (`id === "new"` to create).
- `app/components/reviews/DynamicReflectionField.vue` — renders one snapshot field by type.
- `app/components/reviews/SelfScoreField.vue` — the fixed 1–10 self-score control.

**Modify:**
- `server/database/schema.ts` — add `reviewTemplates` table + relations; add `templateId`, `templateSnapshot`, `answers`, `selfScore` columns to `reviewSchedules`.
- `server/schemas/api.ts` — extend `CreateReviewScheduleRequestSchema` (`templateId`) and `UpdateReviewScheduleRequestSchema` (`answers`, `selfScore`).
- `server/api/reviews/index.post.ts` — resolve + store template snapshot on create.
- `server/api/reviews/[id]/index.patch.ts` — accept and validate `answers` + `selfScore`.
- `server/database/seed.ts` — create a Default template for the seeded workspace.
- `package.json` — add `db:seed-review-templates` script.
- `app/pages/buddies/reviews.vue` — add preset dropdown to the create-review modal.
- `app/pages/reviews/[id].vue` — render dynamic fields from `templateSnapshot`, add self-score, save to `answers`.

---

## Task 1: Template field schema + inferred type

**Files:**
- Create: `server/schemas/reviewTemplates.ts`
- Test: `server/schemas/reviewTemplates.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/schemas/reviewTemplates.test.ts
import { describe, it, expect } from "vitest";
import {
  ReviewTemplateFieldSchema,
  CreateReviewTemplateRequestSchema,
} from "./reviewTemplates";

describe("ReviewTemplateFieldSchema", () => {
  const base = {
    id: "11111111-1111-1111-1111-111111111111",
    label: "What went well?",
    required: false,
  };

  it("accepts a long_text field", () => {
    const parsed = ReviewTemplateFieldSchema.parse({ ...base, type: "long_text" });
    expect(parsed.type).toBe("long_text");
  });

  it("accepts a section field", () => {
    const parsed = ReviewTemplateFieldSchema.parse({ ...base, type: "section" });
    expect(parsed.type).toBe("section");
  });

  it("requires non-empty options for multiple_choice", () => {
    expect(() =>
      ReviewTemplateFieldSchema.parse({ ...base, type: "multiple_choice", options: [] }),
    ).toThrow();
    const ok = ReviewTemplateFieldSchema.parse({
      ...base,
      type: "multiple_choice",
      options: ["Yes", "No"],
    });
    expect(ok.options).toEqual(["Yes", "No"]);
  });

  it("rejects a blank label", () => {
    expect(() =>
      ReviewTemplateFieldSchema.parse({ ...base, label: "", type: "long_text" }),
    ).toThrow();
  });

  it("rejects an invalid uuid id", () => {
    expect(() =>
      ReviewTemplateFieldSchema.parse({ ...base, id: "not-a-uuid", type: "long_text" }),
    ).toThrow();
  });
});

describe("CreateReviewTemplateRequestSchema", () => {
  it("requires a name and accepts a fields array", () => {
    const parsed = CreateReviewTemplateRequestSchema.parse({
      name: "Developer",
      description: null,
      fields: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          type: "long_text",
          label: "Reflection",
          required: false,
        },
      ],
    });
    expect(parsed.name).toBe("Developer");
    expect(parsed.fields).toHaveLength(1);
  });

  it("rejects an empty name", () => {
    expect(() =>
      CreateReviewTemplateRequestSchema.parse({ name: "", fields: [] }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/schemas/reviewTemplates.test.ts`
Expected: FAIL — cannot find module `./reviewTemplates`.

- [ ] **Step 3: Write the schema module**

```typescript
// server/schemas/reviewTemplates.ts
import { z } from "zod";

export const ReviewTemplateFieldSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["long_text", "multiple_choice", "section"]),
    label: z.string().min(1, "Label is required").max(200),
    helpText: z.string().max(500).optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1)).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "multiple_choice") {
      if (!field.options || field.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiple choice fields need at least one option",
          path: ["options"],
        });
      }
    }
  });

export type ReviewTemplateField = z.infer<typeof ReviewTemplateFieldSchema>;

export const ReviewTemplateFieldsSchema = z.array(ReviewTemplateFieldSchema);

export const CreateReviewTemplateRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).nullable().optional(),
  fields: ReviewTemplateFieldsSchema,
});

export const UpdateReviewTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  fields: ReviewTemplateFieldsSchema.optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/schemas/reviewTemplates.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add server/schemas/reviewTemplates.ts server/schemas/reviewTemplates.test.ts
git commit -m "feat: add review template field schemas"
```

---

## Task 2: Pure template util (defaults, snapshot, answer validation)

**Files:**
- Create: `server/utils/reviewTemplates.ts`
- Test: `server/utils/reviewTemplates.test.ts`

Note: the field ids in `DEFAULT_TEMPLATE_FIELDS` are **fixed constants** because the migration in Task 6 maps the legacy reflection columns onto these exact ids.

- [ ] **Step 1: Write the failing test**

```typescript
// server/utils/reviewTemplates.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATE_FIELDS,
  DEFAULT_FIELD_IDS,
  buildSnapshot,
  validateAnswers,
} from "./reviewTemplates";

describe("DEFAULT_TEMPLATE_FIELDS", () => {
  it("has three long_text fields with stable ids", () => {
    expect(DEFAULT_TEMPLATE_FIELDS).toHaveLength(3);
    expect(DEFAULT_TEMPLATE_FIELDS.every((f) => f.type === "long_text")).toBe(true);
    expect(DEFAULT_TEMPLATE_FIELDS.map((f) => f.id)).toEqual([
      DEFAULT_FIELD_IDS.learnings,
      DEFAULT_FIELD_IDS.highlights,
      DEFAULT_FIELD_IDS.concerns,
    ]);
  });
});

describe("buildSnapshot", () => {
  it("returns a deep copy validated against the field schema", () => {
    const snap = buildSnapshot(DEFAULT_TEMPLATE_FIELDS);
    expect(snap).toEqual(DEFAULT_TEMPLATE_FIELDS);
    expect(snap).not.toBe(DEFAULT_TEMPLATE_FIELDS);
  });

  it("throws on an invalid field", () => {
    expect(() => buildSnapshot([{ id: "x", type: "long_text", label: "" } as never])).toThrow();
  });
});

describe("validateAnswers", () => {
  const snapshot = [
    { id: "a1", type: "long_text", label: "Text", required: false },
    { id: "b2", type: "multiple_choice", label: "Status", required: false, options: ["On track", "At risk"] },
    { id: "c3", type: "section", label: "Heading", required: false },
  ] as never[];

  it("returns null for valid answers", () => {
    expect(validateAnswers(snapshot, { a1: "<p>hi</p>", b2: "On track" })).toBeNull();
  });

  it("rejects an unknown field id", () => {
    expect(validateAnswers(snapshot, { zz: "x" })).toMatch(/unknown field/i);
  });

  it("rejects an answer for a section field", () => {
    expect(validateAnswers(snapshot, { c3: "nope" })).toMatch(/section/i);
  });

  it("rejects a multiple_choice value not in options", () => {
    expect(validateAnswers(snapshot, { b2: "Off track" })).toMatch(/not a valid option/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/utils/reviewTemplates.test.ts`
Expected: FAIL — cannot find module `./reviewTemplates`.

- [ ] **Step 3: Write the util**

```typescript
// server/utils/reviewTemplates.ts
import {
  ReviewTemplateFieldsSchema,
  type ReviewTemplateField,
} from "#server/schemas/reviewTemplates";

// Stable ids so the one-time migration can map legacy columns onto known fields.
export const DEFAULT_FIELD_IDS = {
  learnings: "00000000-0000-0000-0000-000000000001",
  highlights: "00000000-0000-0000-0000-000000000002",
  concerns: "00000000-0000-0000-0000-000000000003",
} as const;

export const DEFAULT_TEMPLATE_FIELDS: ReviewTemplateField[] = [
  {
    id: DEFAULT_FIELD_IDS.learnings,
    type: "long_text",
    label: "What have I learnt in the past three months?",
    helpText: "Think about technical skills, soft skills, or domain knowledge...",
    required: false,
  },
  {
    id: DEFAULT_FIELD_IDS.highlights,
    type: "long_text",
    label: "Any highlights?",
    helpText: "Projects delivered, problems solved, or team contributions...",
    required: false,
  },
  {
    id: DEFAULT_FIELD_IDS.concerns,
    type: "long_text",
    label: "Are you worried about anything right now?",
    helpText: "Blockers, uncertainties, or support you might need...",
    required: false,
  },
];

/** Validate + deep-copy a template's fields for storage as an immutable snapshot. */
export function buildSnapshot(fields: ReviewTemplateField[]): ReviewTemplateField[] {
  return ReviewTemplateFieldsSchema.parse(fields);
}

/**
 * Validate a reviewee answers map against a review's field snapshot.
 * Returns an error message string, or null if valid.
 */
export function validateAnswers(
  snapshot: ReviewTemplateField[],
  answers: Record<string, string>,
): string | null {
  const byId = new Map(snapshot.map((f) => [f.id, f]));
  for (const [fieldId, value] of Object.entries(answers)) {
    const field = byId.get(fieldId);
    if (!field) return `Answer for unknown field "${fieldId}"`;
    if (field.type === "section") return `Cannot answer a section field "${fieldId}"`;
    if (typeof value !== "string") return `Answer for "${fieldId}" must be a string`;
    if (field.type === "multiple_choice" && value !== "" && !field.options?.includes(value)) {
      return `"${value}" is not a valid option for "${field.label}"`;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/utils/reviewTemplates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/reviewTemplates.ts server/utils/reviewTemplates.test.ts
git commit -m "feat: add review template snapshot + answer validation util"
```

---

## Task 3: Database schema + migration

**Files:**
- Modify: `server/database/schema.ts`
- Create: a generated migration under `server/database/migrations/`

- [ ] **Step 1: Add the `reviewTemplates` table**

In `server/database/schema.ts`, after the `reviewSchedules` relations block (around line 291), add:

```typescript
import type { ReviewTemplateField } from "#server/schemas/reviewTemplates";

// Review templates (presets) — admin-configurable reflection structures
export const reviewTemplates = pgTable("review_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  fields: jsonb("fields").$type<ReviewTemplateField[]>().notNull().default([]),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});
```

Put the `import type` line with the other imports at the top of the file. (It is a type-only import, so there is no runtime cycle with the schema module.)

- [ ] **Step 2: Add new columns to `reviewSchedules`**

In the `reviewSchedules` table definition, add these fields just before `reminderSent7d` (keep the existing reflection columns — they stay as a nullable safety net):

```typescript
  // Review templates (presets)
  templateId: uuid("template_id").references(() => reviewTemplates.id, {
    onDelete: "set null",
  }),
  templateSnapshot: jsonb("template_snapshot").$type<ReviewTemplateField[]>(),
  answers: jsonb("answers").$type<Record<string, string>>().default({}),
  selfScore: integer("self_score"),
```

`integer` is already imported (line 9). `jsonb` is already imported.

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new `server/database/migrations/00XX_*.sql` file is created adding the `review_templates` table and the four new `review_schedules` columns. No prompts (these are purely additive).

- [ ] **Step 4: Apply the migration locally**

Run: `npm run db:migrate`
Expected: migration applies cleanly against the local DB.

- [ ] **Step 5: Verify the project still type-checks/builds**

Run: `npx vitest run server/utils/reviewTemplates.test.ts server/schemas/reviewTemplates.test.ts`
Expected: PASS (confirms the type import resolves and nothing broke).

- [ ] **Step 6: Commit**

```bash
git add server/database/schema.ts server/database/migrations
git commit -m "feat: add review_templates table and snapshot columns"
```

---

## Task 4: Admin templates API — create + list

**Files:**
- Create: `server/api/admin/review-templates/index.get.ts`
- Create: `server/api/admin/review-templates/index.post.ts`
- Test: `server/api/admin/review-templates/index.post.test.ts`

All admin template endpoints scope by the acting user's `workspaceId` (looked up from the `users` table) and require `session.user.role === "admin"`.

- [ ] **Step 1: Write the failing test**

```typescript
// server/api/admin/review-templates/index.post.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEvent } from "#server/__tests__/helpers/mock-event";

const insertReturning = vi.fn();
const selectWhere = vi.fn();

vi.mock("#server/database/connection", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: selectWhere }) }) }),
    insert: () => ({ values: () => ({ returning: insertReturning }) }),
  },
}));

const { default: handler } = await import("./index.post");

function adminEvent(body: unknown) {
  const event = createMockEvent({ method: "POST", path: "/api/admin/review-templates" });
  event.context.session = { user: { id: "admin-1", role: "admin" } } as never;
  // make readBody return our payload
  (event as never as { _body: unknown })._body = body;
  return event;
}

describe("POST /api/admin/review-templates", () => {
  beforeEach(() => {
    insertReturning.mockReset();
    selectWhere.mockReset();
    selectWhere.mockResolvedValue([{ workspaceId: "ws-1" }]);
  });

  it("rejects non-admins", async () => {
    const event = createMockEvent({ method: "POST", path: "/api/admin/review-templates" });
    event.context.session = { user: { id: "u1", role: "member" } } as never;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("creates a template scoped to the admin's workspace", async () => {
    insertReturning.mockResolvedValue([{ id: "tpl-1", name: "Developer" }]);
    const event = adminEvent({
      name: "Developer",
      fields: [
        { id: "11111111-1111-1111-1111-111111111111", type: "long_text", label: "X", required: false },
      ],
    });
    const res = await handler(event);
    expect(res).toMatchObject({ success: true, template: { id: "tpl-1" } });
  });
});
```

> Note: `createMockEvent` provides `event.context`. If the helper's `readBody` support differs, follow the existing pattern in `server/__tests__/helpers/mock-event.ts` for supplying a body (read it first). Adjust the `_body` mechanism in the test to match that helper.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/admin/review-templates/index.post.test.ts`
Expected: FAIL — cannot find module `./index.post`.

- [ ] **Step 3: Write the POST handler**

```typescript
// server/api/admin/review-templates/index.post.ts
import { db } from "#server/database/connection";
import { reviewTemplates, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateBody } from "#server/utils/validation";
import { CreateReviewTemplateRequestSchema } from "#server/schemas/reviewTemplates";
import { buildSnapshot } from "#server/utils/reviewTemplates";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  if (session.user.role !== "admin") {
    throw createError({ statusCode: 403, message: "Admin access required" });
  }

  const body = await validateBody(event, CreateReviewTemplateRequestSchema);

  // Validate the field structure up front (throws on bad fields).
  let fields;
  try {
    fields = buildSnapshot(body.fields);
  } catch {
    throw createError({ statusCode: 400, message: "Invalid template fields" });
  }

  const [actor] = await db
    .select({ workspaceId: users.workspaceId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [template] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId: actor?.workspaceId ?? null,
      name: body.name,
      description: body.description ?? null,
      isDefault: false,
      fields,
      createdBy: session.user.id,
    })
    .returning();

  return { success: true, template };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/admin/review-templates/index.post.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the GET (list) handler**

```typescript
// server/api/admin/review-templates/index.get.ts
import { db } from "#server/database/connection";
import { reviewTemplates, users } from "#server/database/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  if (session.user.role !== "admin") {
    throw createError({ statusCode: 403, message: "Admin access required" });
  }

  const [actor] = await db
    .select({ workspaceId: users.workspaceId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const templates = await db
    .select()
    .from(reviewTemplates)
    .where(
      and(
        actor?.workspaceId
          ? eq(reviewTemplates.workspaceId, actor.workspaceId)
          : isNull(reviewTemplates.workspaceId),
        isNull(reviewTemplates.archivedAt),
      ),
    )
    .orderBy(desc(reviewTemplates.isDefault), desc(reviewTemplates.createdAt));

  return { success: true, templates };
});
```

- [ ] **Step 6: Manually verify the list endpoint compiles via the test run**

Run: `npx vitest run server/api/admin/review-templates/index.post.test.ts`
Expected: still PASS (import graph for the new GET file is independent; this confirms no shared breakage).

- [ ] **Step 7: Commit**

```bash
git add server/api/admin/review-templates/index.get.ts server/api/admin/review-templates/index.post.ts server/api/admin/review-templates/index.post.test.ts
git commit -m "feat: add admin review-templates list and create endpoints"
```

---

## Task 5: Admin templates API — get one, update, archive, duplicate

**Files:**
- Create: `server/api/admin/review-templates/[id]/index.get.ts`
- Create: `server/api/admin/review-templates/[id]/index.patch.ts`
- Create: `server/api/admin/review-templates/[id]/index.delete.ts`
- Create: `server/api/admin/review-templates/[id]/duplicate.post.ts`

Reuse this admin+workspace guard inline in each handler (same as Task 4). The Default template (`isDefault = true`) must **not** be archivable.

- [ ] **Step 1: Write the GET-one handler**

```typescript
// server/api/admin/review-templates/[id]/index.get.ts
import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) throw createError({ statusCode: 401, message: "Unauthorized" });
  if (session.user.role !== "admin") throw createError({ statusCode: 403, message: "Admin access required" });

  const id = getRouterParam(event, "id");
  const [template] = await db
    .select()
    .from(reviewTemplates)
    .where(eq(reviewTemplates.id, id!))
    .limit(1);

  if (!template) throw createError({ statusCode: 404, message: "Template not found" });
  return { success: true, template };
});
```

- [ ] **Step 2: Write the PATCH (update) handler**

```typescript
// server/api/admin/review-templates/[id]/index.patch.ts
import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateBody } from "#server/utils/validation";
import { UpdateReviewTemplateRequestSchema } from "#server/schemas/reviewTemplates";
import { buildSnapshot } from "#server/utils/reviewTemplates";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) throw createError({ statusCode: 401, message: "Unauthorized" });
  if (session.user.role !== "admin") throw createError({ statusCode: 403, message: "Admin access required" });

  const id = getRouterParam(event, "id");
  const body = await validateBody(event, UpdateReviewTemplateRequestSchema);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.fields !== undefined) {
    try {
      updateData.fields = buildSnapshot(body.fields);
    } catch {
      throw createError({ statusCode: 400, message: "Invalid template fields" });
    }
  }

  const [template] = await db
    .update(reviewTemplates)
    .set(updateData)
    .where(eq(reviewTemplates.id, id!))
    .returning();

  if (!template) throw createError({ statusCode: 404, message: "Template not found" });
  return { success: true, template };
});
```

- [ ] **Step 3: Write the DELETE (archive) handler — Default is protected**

```typescript
// server/api/admin/review-templates/[id]/index.delete.ts
import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) throw createError({ statusCode: 401, message: "Unauthorized" });
  if (session.user.role !== "admin") throw createError({ statusCode: 403, message: "Admin access required" });

  const id = getRouterParam(event, "id");
  const [existing] = await db
    .select({ isDefault: reviewTemplates.isDefault })
    .from(reviewTemplates)
    .where(eq(reviewTemplates.id, id!))
    .limit(1);

  if (!existing) throw createError({ statusCode: 404, message: "Template not found" });
  if (existing.isDefault) {
    throw createError({ statusCode: 400, message: "The default template cannot be archived" });
  }

  await db
    .update(reviewTemplates)
    .set({ archivedAt: new Date() })
    .where(eq(reviewTemplates.id, id!));

  return { success: true };
});
```

- [ ] **Step 4: Write the duplicate handler**

```typescript
// server/api/admin/review-templates/[id]/duplicate.post.ts
import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) throw createError({ statusCode: 401, message: "Unauthorized" });
  if (session.user.role !== "admin") throw createError({ statusCode: 403, message: "Admin access required" });

  const id = getRouterParam(event, "id");
  const [source] = await db
    .select()
    .from(reviewTemplates)
    .where(eq(reviewTemplates.id, id!))
    .limit(1);

  if (!source) throw createError({ statusCode: 404, message: "Template not found" });

  const [copy] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId: source.workspaceId,
      name: `${source.name} (copy)`,
      description: source.description,
      isDefault: false,
      fields: source.fields,
      createdBy: session.user.id,
    })
    .returning();

  return { success: true, template: copy };
});
```

- [ ] **Step 5: Verify nothing broke**

Run: `npx vitest run server/api/admin/review-templates`
Expected: PASS (Task 4 test still green; new files import cleanly).

- [ ] **Step 6: Commit**

```bash
git add server/api/admin/review-templates/\[id\]
git commit -m "feat: add admin review-template get/update/archive/duplicate endpoints"
```

---

## Task 6: Store the snapshot when a review is created

**Files:**
- Modify: `server/schemas/api.ts` (around lines 319-329, `CreateReviewScheduleRequestSchema`)
- Modify: `server/api/reviews/index.post.ts`

- [ ] **Step 1: Add `templateId` to the create schema**

In `server/schemas/api.ts`, add to `CreateReviewScheduleRequestSchema`:

```typescript
  templateId: z.string().uuid().nullable().optional(),
```

(Place it after the `name` field, before `notes`.)

- [ ] **Step 2: Resolve and store the snapshot in the create handler**

In `server/api/reviews/index.post.ts`:

Add imports at the top:

```typescript
import { reviewTemplates } from "#server/database/schema";
import { and, isNull } from "drizzle-orm";
import { buildSnapshot, DEFAULT_TEMPLATE_FIELDS } from "#server/utils/reviewTemplates";
```

(`reviewSchedules`, `users`, `eq` are already imported; extend the existing `drizzle-orm` import with `and, isNull` rather than duplicating.)

Extend the destructure (currently `const { userId, scheduledDate, name, notes } = body;`):

```typescript
const { userId, scheduledDate, name, notes, templateId } = body;
```

Then, immediately before the `const [newReview] = await db.insert(reviewSchedules)` call, resolve the snapshot:

```typescript
    // Resolve the reflection field snapshot for this review.
    let templateSnapshot = DEFAULT_TEMPLATE_FIELDS;
    let resolvedTemplateId: string | null = null;

    if (templateId) {
      const [tpl] = await db
        .select()
        .from(reviewTemplates)
        .where(and(eq(reviewTemplates.id, templateId), isNull(reviewTemplates.archivedAt)))
        .limit(1);
      if (!tpl) {
        throw createError({ statusCode: 404, message: "Review template not found" });
      }
      templateSnapshot = buildSnapshot(tpl.fields);
      resolvedTemplateId = tpl.id;
    } else {
      // Fall back to the acting buddy's workspace default template if one exists.
      const [actor] = await db
        .select({ workspaceId: users.workspaceId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      if (actor?.workspaceId) {
        const [def] = await db
          .select()
          .from(reviewTemplates)
          .where(
            and(
              eq(reviewTemplates.workspaceId, actor.workspaceId),
              eq(reviewTemplates.isDefault, true),
              isNull(reviewTemplates.archivedAt),
            ),
          )
          .limit(1);
        if (def) {
          templateSnapshot = buildSnapshot(def.fields);
          resolvedTemplateId = def.id;
        }
      }
    }
```

Then add these three fields to the `.values({ ... })` object of the insert:

```typescript
        templateId: resolvedTemplateId,
        templateSnapshot,
        answers: {},
```

- [ ] **Step 3: Verify existing review tests still pass**

Run: `npx vitest run server/api/reviews`
Expected: PASS (or, if no review API tests exist, no failures introduced — confirm with `npx vitest run`).

- [ ] **Step 4: Commit**

```bash
git add server/schemas/api.ts server/api/reviews/index.post.ts
git commit -m "feat: snapshot review template fields when scheduling a review"
```

---

## Task 7: Accept answers + self-score on review update

**Files:**
- Modify: `server/schemas/api.ts` (`UpdateReviewScheduleRequestSchema`, around lines 332-354)
- Modify: `server/api/reviews/[id]/index.patch.ts`

- [ ] **Step 1: Extend the update schema**

In `server/schemas/api.ts`, add to `UpdateReviewScheduleRequestSchema`:

```typescript
  answers: z.record(z.string(), z.string()).optional(),
  selfScore: z.number().int().min(1).max(10).nullable().optional(),
```

- [ ] **Step 2: Validate answers against the review's snapshot in the PATCH handler**

In `server/api/reviews/[id]/index.patch.ts`:

Add import:

```typescript
import { validateAnswers } from "#server/utils/reviewTemplates";
```

Extend the body destructure (currently ends with `revieweeComments`) to include:

```typescript
  answers,
  selfScore,
```

After the review is loaded but before building `updateData` (the handler already fetches the review to authorize — reuse that record; it now includes `templateSnapshot`), add:

```typescript
    if (answers !== undefined) {
      const snapshot = review.templateSnapshot ?? [];
      const answersError = validateAnswers(snapshot, answers);
      if (answersError) {
        throw createError({ statusCode: 400, message: answersError });
      }
    }
```

> If the existing handler names the loaded review record differently (e.g. `existingReview`), use that name. Read the file's load step first and match it.

Then, where the handler assembles `updateData` from the optional fields, add:

```typescript
    if (answers !== undefined) updateData.answers = answers;
    if (selfScore !== undefined) updateData.selfScore = selfScore;
```

- [ ] **Step 3: Verify**

Run: `npx vitest run server/api/reviews server/utils/reviewTemplates.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/schemas/api.ts server/api/reviews/\[id\]/index.patch.ts
git commit -m "feat: validate and persist review answers and self-score"
```

---

## Task 8: Migration script + seed default template

**Files:**
- Create: `server/database/scripts/seed-review-templates.ts`
- Modify: `package.json` (scripts)
- Modify: `server/database/seed.ts`

- [ ] **Step 1: Write the migration/backfill script**

```typescript
// server/database/scripts/seed-review-templates.ts
import { db } from "#server/database/connection";
import { reviewTemplates, reviewSchedules, users, workspaces } from "#server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_TEMPLATE_FIELDS, DEFAULT_FIELD_IDS } from "#server/utils/reviewTemplates";

async function ensureDefaultTemplate(workspaceId: string | null, createdBy: string | null) {
  const whereWorkspace = workspaceId
    ? eq(reviewTemplates.workspaceId, workspaceId)
    : isNull(reviewTemplates.workspaceId);
  const [existing] = await db
    .select()
    .from(reviewTemplates)
    .where(and(whereWorkspace, eq(reviewTemplates.isDefault, true)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId,
      name: "Default",
      description: "The standard three-question reflection.",
      isDefault: true,
      fields: DEFAULT_TEMPLATE_FIELDS,
      createdBy,
    })
    .returning();
  return created;
}

async function main() {
  // One default template per workspace (plus a null-workspace fallback).
  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);
  const [anyAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  for (const ws of allWorkspaces) {
    await ensureDefaultTemplate(ws.id, anyAdmin?.id ?? null);
  }
  await ensureDefaultTemplate(null, anyAdmin?.id ?? null);

  // Backfill every review that has no snapshot yet.
  const reviews = await db
    .select()
    .from(reviewSchedules)
    .where(isNull(reviewSchedules.templateSnapshot));

  let migrated = 0;
  for (const r of reviews) {
    const answers: Record<string, string> = {};
    if (r.reflectionLearnings) answers[DEFAULT_FIELD_IDS.learnings] = r.reflectionLearnings;
    if (r.reflectionHighlights) answers[DEFAULT_FIELD_IDS.highlights] = r.reflectionHighlights;
    if (r.reflectionConcerns) answers[DEFAULT_FIELD_IDS.concerns] = r.reflectionConcerns;

    await db
      .update(reviewSchedules)
      .set({ templateSnapshot: DEFAULT_TEMPLATE_FIELDS, answers })
      .where(eq(reviewSchedules.id, r.id));
    migrated++;
  }

  console.log(`Seeded default templates and backfilled ${migrated} reviews.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json`, in the `scripts` block alongside the other `db:*` entries, add:

```json
    "db:seed-review-templates": "tsx server/database/scripts/seed-review-templates.ts",
```

- [ ] **Step 3: Run the backfill locally**

Run: `npm run db:seed-review-templates`
Expected: prints `Seeded default templates and backfilled N reviews.` and exits 0.

- [ ] **Step 4: Verify in the DB GUI**

Run: `npm run db:studio`
Confirm: a `review_templates` row with `is_default = true` exists, and existing `review_schedules` rows now have a non-null `template_snapshot` and an `answers` object populated from their old reflection columns. Close studio.

- [ ] **Step 5: Add a default template to the dev seed**

In `server/database/seed.ts`, after the workspace + admin user are created (match the file's existing variable names for the seeded workspace id and an admin/user id), insert a default template. Add the import at the top:

```typescript
import { DEFAULT_TEMPLATE_FIELDS } from "#server/utils/reviewTemplates";
```

And, after the workspace/admin creation, add:

```typescript
  await db.insert(reviewTemplates).values({
    workspaceId: <seededWorkspaceId>,
    name: "Default",
    description: "The standard three-question reflection.",
    isDefault: true,
    fields: DEFAULT_TEMPLATE_FIELDS,
    createdBy: <seededAdminUserId>,
  });
```

Replace `<seededWorkspaceId>` and `<seededAdminUserId>` with the actual variables the seed file already holds (read the file to find them, e.g. the id returned from the workspace insert and the admin user insert). Ensure `reviewTemplates` is added to the existing schema import in `seed.ts`.

- [ ] **Step 6: Verify a clean reseed works**

Run: `npm run db:reseed`
Expected: completes without error; a default template is created for the seeded workspace.

- [ ] **Step 7: Commit**

```bash
git add server/database/scripts/seed-review-templates.ts package.json server/database/seed.ts
git commit -m "feat: seed default review template and backfill existing reviews"
```

---

## Task 9: Admin builder UI — list page

**Files:**
- Create: `app/pages/(admin)/admin/review-templates/index.vue`

Pattern source: `app/pages/(admin)/admin/users.vue` (UDashboardPanel + `$api`). The `(admin)` route group applies `admin.global.ts` automatically — no per-page middleware needed.

- [ ] **Step 1: Write the list page**

```vue
<!-- app/pages/(admin)/admin/review-templates/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: "default" });
useHead({ title: "Review Templates" });

const toast = useToast();
const loading = ref(true);
const templates = ref<
  Array<{ id: string; name: string; description: string | null; isDefault: boolean; fields: unknown[] }>
>([]);

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const data = await $api("/admin/review-templates");
    templates.value = data.templates;
  } catch (e) {
    console.error("Failed to load templates:", e);
  } finally {
    loading.value = false;
  }
};

const duplicate = async (id: string) => {
  try {
    await $api(`/admin/review-templates/${id}/duplicate`, { method: "POST" });
    await fetchTemplates();
    toast.add({ title: "Template duplicated", color: "success", icon: "i-heroicons-check-circle" });
  } catch {
    toast.add({ title: "Failed to duplicate", color: "error", icon: "i-heroicons-x-circle" });
  }
};

const archive = async (id: string) => {
  try {
    await $api(`/admin/review-templates/${id}`, { method: "DELETE" });
    await fetchTemplates();
    toast.add({ title: "Template archived", color: "success", icon: "i-heroicons-check-circle" });
  } catch (e: unknown) {
    const message = (e as { data?: { message?: string } })?.data?.message || "Failed to archive";
    toast.add({ title: message, color: "error", icon: "i-heroicons-x-circle" });
  }
};

onMounted(fetchTemplates);
</script>

<template>
  <UDashboardPanel id="admin-review-templates">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-heroicons-clipboard-document-list" class="text-purple-500 text-3xl" />
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Review Templates
              </h1>
            </div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Configure the reflection questions buddies can pick when scheduling a review.
            </p>
          </div>
          <UButton
            icon="i-heroicons-plus"
            color="primary"
            :to="`/admin/review-templates/new`"
          >
            New Template
          </UButton>
        </div>

        <div v-if="loading" class="py-12 text-center text-gray-500">Loading…</div>

        <div v-else class="space-y-3">
          <UCard v-for="t in templates" :key="t.id">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-900 dark:text-white">{{ t.name }}</span>
                  <UBadge v-if="t.isDefault" color="neutral" variant="subtle">Default</UBadge>
                </div>
                <p class="text-sm text-gray-500">
                  {{ t.fields.length }} field{{ t.fields.length === 1 ? "" : "s" }}
                  <span v-if="t.description"> · {{ t.description }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  :to="`/admin/review-templates/${t.id}`"
                >
                  Edit
                </UButton>
                <UButton variant="ghost" icon="i-heroicons-document-duplicate" @click="duplicate(t.id)">
                  Duplicate
                </UButton>
                <UButton
                  v-if="!t.isDefault"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-archive-box"
                  @click="archive(t.id)"
                >
                  Archive
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Add a sidebar/nav link (if admin nav is centralized)**

Search for where existing admin links (e.g. "Users", "Reports") are declared:

Run: `grep -rn "admin/reports" app/ --include=*.vue`

Add a "Review Templates" entry pointing to `/admin/review-templates` next to the others, matching their object shape (label/icon/to). If admin nav is hard-coded per layout, follow that exact structure.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/pages/\(admin\)/admin/review-templates/index.vue
git commit -m "feat: add admin review templates list page"
```

---

## Task 10: Admin builder UI — editor page

**Files:**
- Create: `app/pages/(admin)/admin/review-templates/[id].vue`

This page handles both create (`id === "new"`) and edit. Fields are reordered with up/down buttons (no drag-and-drop). New field ids are generated with `crypto.randomUUID()`.

- [ ] **Step 1: Write the editor page**

```vue
<!-- app/pages/(admin)/admin/review-templates/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: "default" });

type FieldType = "long_text" | "multiple_choice" | "section";
interface Field {
  id: string;
  type: FieldType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const templateId = computed(() => route.params.id as string);
const isNew = computed(() => templateId.value === "new");

useHead({ title: isNew.value ? "New Review Template" : "Edit Review Template" });

const name = ref("");
const description = ref<string>("");
const isDefault = ref(false);
const fields = ref<Field[]>([]);
const saving = ref(false);

const typeOptions = [
  { label: "Long text", value: "long_text" },
  { label: "Multiple choice", value: "multiple_choice" },
  { label: "Section header", value: "section" },
];

const addField = (type: FieldType) => {
  fields.value.push({
    id: crypto.randomUUID(),
    type,
    label: "",
    helpText: "",
    required: false,
    options: type === "multiple_choice" ? [""] : undefined,
  });
};

const removeField = (index: number) => fields.value.splice(index, 1);

const move = (index: number, delta: number) => {
  const target = index + delta;
  if (target < 0 || target >= fields.value.length) return;
  const copy = [...fields.value];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  fields.value = copy;
};

const addOption = (field: Field) => {
  field.options = [...(field.options ?? []), ""];
};
const removeOption = (field: Field, i: number) => {
  field.options?.splice(i, 1);
};

const load = async () => {
  if (isNew.value) {
    fields.value = [];
    return;
  }
  const data = await $api(`/admin/review-templates/${templateId.value}`);
  const t = data.template;
  name.value = t.name;
  description.value = t.description ?? "";
  isDefault.value = t.isDefault;
  fields.value = t.fields;
};

const validate = (): string | null => {
  if (!name.value.trim()) return "Template name is required";
  for (const f of fields.value) {
    if (!f.label.trim()) return "Every field needs a label";
    if (f.type === "multiple_choice") {
      const opts = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (opts.length === 0) return `"${f.label}" needs at least one option`;
    }
  }
  return null;
};

const save = async () => {
  const err = validate();
  if (err) {
    toast.add({ title: err, color: "error", icon: "i-heroicons-x-circle" });
    return;
  }
  saving.value = true;

  // Normalize: trim option values, drop empties, strip options from non-MC fields.
  const payloadFields = fields.value.map((f) => ({
    id: f.id,
    type: f.type,
    label: f.label.trim(),
    helpText: f.helpText?.trim() || undefined,
    required: f.required,
    options:
      f.type === "multiple_choice"
        ? (f.options ?? []).map((o) => o.trim()).filter(Boolean)
        : undefined,
  }));

  try {
    if (isNew.value) {
      await $api("/admin/review-templates", {
        method: "POST",
        body: { name: name.value.trim(), description: description.value || null, fields: payloadFields },
      });
    } else {
      await $api(`/admin/review-templates/${templateId.value}`, {
        method: "PATCH",
        body: { name: name.value.trim(), description: description.value || null, fields: payloadFields },
      });
    }
    toast.add({ title: "Template saved", color: "success", icon: "i-heroicons-check-circle" });
    router.push("/admin/review-templates");
  } catch (e: unknown) {
    const message = (e as { data?: { message?: string } })?.data?.message || "Failed to save";
    toast.add({ title: message, color: "error", icon: "i-heroicons-x-circle" });
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <UDashboardPanel id="admin-review-template-editor">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2 max-w-3xl">
        <div class="mb-6">
          <UButton variant="link" icon="i-heroicons-arrow-left" to="/admin/review-templates">
            Back to templates
          </UButton>
        </div>

        <div class="space-y-4 mb-8">
          <UFormField label="Template name" required>
            <UInput v-model="name" placeholder="e.g. Developer" :disabled="isDefault && !isNew" />
          </UFormField>
          <UFormField label="Description">
            <UInput v-model="description" placeholder="Optional, shown to admins" />
          </UFormField>
          <p v-if="isDefault" class="text-sm text-amber-600 dark:text-amber-400">
            This is the default template. You can edit its fields, but it cannot be renamed or archived.
          </p>
        </div>

        <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Fields</h2>

        <div class="space-y-4">
          <UCard v-for="(field, index) in fields" :key="field.id">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 space-y-3">
                <UBadge color="neutral" variant="subtle">
                  {{ typeOptions.find((t) => t.value === field.type)?.label }}
                </UBadge>

                <UFormField :label="field.type === 'section' ? 'Heading' : 'Question'">
                  <UInput v-model="field.label" placeholder="Enter label" />
                </UFormField>

                <UFormField label="Help text">
                  <UInput v-model="field.helpText" placeholder="Optional guidance" />
                </UFormField>

                <template v-if="field.type === 'multiple_choice'">
                  <UFormField label="Options">
                    <div class="space-y-2">
                      <div
                        v-for="(_, oi) in field.options"
                        :key="oi"
                        class="flex items-center gap-2"
                      >
                        <UInput v-model="field.options[oi]" placeholder="Option" class="flex-1" />
                        <UButton
                          variant="ghost"
                          color="error"
                          icon="i-heroicons-x-mark"
                          @click="removeOption(field, oi)"
                        />
                      </div>
                      <UButton variant="soft" size="xs" icon="i-heroicons-plus" @click="addOption(field)">
                        Add option
                      </UButton>
                    </div>
                  </UFormField>
                </template>

                <UCheckbox
                  v-if="field.type !== 'section'"
                  v-model="field.required"
                  label="Required"
                />
              </div>

              <div class="flex flex-col gap-1">
                <UButton
                  variant="ghost"
                  icon="i-heroicons-chevron-up"
                  :disabled="index === 0"
                  @click="move(index, -1)"
                />
                <UButton
                  variant="ghost"
                  icon="i-heroicons-chevron-down"
                  :disabled="index === fields.length - 1"
                  @click="move(index, 1)"
                />
                <UButton
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-trash"
                  @click="removeField(index)"
                />
              </div>
            </div>
          </UCard>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <UButton variant="soft" icon="i-heroicons-plus" @click="addField('long_text')">
            Long text
          </UButton>
          <UButton variant="soft" icon="i-heroicons-plus" @click="addField('multiple_choice')">
            Multiple choice
          </UButton>
          <UButton variant="soft" icon="i-heroicons-plus" @click="addField('section')">
            Section header
          </UButton>
        </div>

        <div class="mt-8 flex justify-end gap-3">
          <UButton variant="ghost" to="/admin/review-templates">Cancel</UButton>
          <UButton color="primary" :loading="saving" @click="save">Save template</UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check in the running app**

Run: `npm run dev`, log in as an admin, visit `/admin/review-templates`, click **New Template**. Add one of each field type, give them labels, add options to the multiple choice, reorder with the up/down arrows, and save. Confirm it appears in the list. Edit it, confirm fields reload. Confirm the **Default** template's name input is disabled and it has no Archive button.

- [ ] **Step 4: Commit**

```bash
git add app/pages/\(admin\)/admin/review-templates/\[id\].vue
git commit -m "feat: add admin review template builder/editor page"
```

---

## Task 11: Preset dropdown in the create-review modal

**Files:**
- Modify: `app/pages/buddies/reviews.vue`

- [ ] **Step 1: Add template state + fetch**

In the `<script setup>` of `app/pages/buddies/reviews.vue`, alongside the existing create-modal state (near `const reviewName = ref<string>("")`), add:

```typescript
const reviewTemplates = ref<Array<{ id: string; name: string; isDefault: boolean }>>([]);
const selectedTemplateId = ref<string | null>(null);

const templateSelectItems = computed(() =>
  reviewTemplates.value.map((t) => ({ label: t.name, value: t.id })),
);

const fetchReviewTemplates = async () => {
  try {
    const data = await $api("/admin/review-templates");
    reviewTemplates.value = data.templates;
    const def = data.templates.find((t: { isDefault: boolean }) => t.isDefault);
    selectedTemplateId.value = def?.id ?? data.templates[0]?.id ?? null;
  } catch {
    // Buddies who are not admins cannot list templates; fall back to no preset
    // (the server then snapshots the workspace default automatically).
    reviewTemplates.value = [];
    selectedTemplateId.value = null;
  }
};

onMounted(fetchReviewTemplates);
```

> Note: `/admin/review-templates` is admin-only. If buddies in this workspace are not admins, this fetch will 403 and the dropdown simply won't render — the server still snapshots the workspace default on create, so behaviour is correct. If product wants non-admin buddies to choose presets, add a separate non-admin `GET /api/reviews/templates` endpoint mirroring Task 4's list handler (without the admin guard) and point this fetch at it. For v1, the admin-only fetch with graceful fallback is acceptable.

- [ ] **Step 2: Send the chosen template id on create**

In `createReview()`, add `templateId` to the POST body:

```typescript
    await $api("/reviews", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        scheduledDate: utcDateString,
        name: reviewName.value,
        templateId: selectedTemplateId.value,
      },
    });
```

- [ ] **Step 3: Add the dropdown to the modal template**

In the create-review modal markup, add this near the name input (only shows when templates were loaded):

```vue
        <UFormField v-if="reviewTemplates.length" label="Review template">
          <USelect
            v-model="selectedTemplateId"
            :items="templateSelectItems"
            placeholder="Choose a template"
          />
        </UFormField>
```

- [ ] **Step 4: Reset selection in `resetForm()`**

Find the existing `resetForm()` function and add:

```typescript
  selectedTemplateId.value =
    reviewTemplates.value.find((t) => t.isDefault)?.id ?? reviewTemplates.value[0]?.id ?? null;
```

- [ ] **Step 5: Verify build + manual check**

Run: `npm run build`
Then `npm run dev`: as a buddy/admin, open the create-review modal, confirm the template dropdown shows with Default preselected, schedule a review, and confirm it is created.

- [ ] **Step 6: Commit**

```bash
git add app/pages/buddies/reviews.vue
git commit -m "feat: add review template picker to scheduling modal"
```

---

## Task 12: Render dynamic reflection fields + self-score on the review page

**Files:**
- Create: `app/components/reviews/DynamicReflectionField.vue`
- Create: `app/components/reviews/SelfScoreField.vue`
- Modify: `app/pages/reviews/[id].vue`

- [ ] **Step 1: Write the dynamic field component**

```vue
<!-- app/components/reviews/DynamicReflectionField.vue -->
<script setup lang="ts">
interface Field {
  id: string;
  type: "long_text" | "multiple_choice" | "section";
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

const props = defineProps<{
  field: Field;
  modelValue: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const proxy = computed({
  get: () => props.modelValue,
  set: (v: string) => emit("update:modelValue", v),
});

const radioItems = computed(() =>
  (props.field.options ?? []).map((o) => ({ label: o, value: o })),
);
</script>

<template>
  <div>
    <!-- Section header: no input -->
    <div v-if="field.type === 'section'" class="pt-2">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ field.label }}</h3>
      <p v-if="field.helpText" class="text-sm text-gray-500 mt-1">{{ field.helpText }}</p>
    </div>

    <!-- Long text: reuse existing TipTap editor -->
    <ReviewsReflectionEditor
      v-else-if="field.type === 'long_text'"
      v-model="proxy"
      :label="field.label + (field.required ? ' *' : '')"
      icon="i-heroicons-pencil"
      :placeholder="field.helpText"
      :readonly="readonly"
    />

    <!-- Multiple choice -->
    <UFormField
      v-else-if="field.type === 'multiple_choice'"
      :label="field.label + (field.required ? ' *' : '')"
      :help="field.helpText"
    >
      <URadioGroup v-model="proxy" :items="radioItems" :disabled="readonly" />
    </UFormField>
  </div>
</template>
```

- [ ] **Step 2: Write the self-score component**

```vue
<!-- app/components/reviews/SelfScoreField.vue -->
<script setup lang="ts">
const props = defineProps<{ modelValue: number | null; readonly?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();

const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const select = (n: number) => {
  if (props.readonly) return;
  emit("update:modelValue", props.modelValue === n ? null : n);
};
</script>

<template>
  <div>
    <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">
      Overall, how do you feel this period has gone? (1–10)
    </p>
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="n in scores"
        :key="n"
        :variant="modelValue === n ? 'solid' : 'outline'"
        :color="modelValue === n ? 'primary' : 'neutral'"
        :disabled="readonly"
        @click="select(n)"
      >
        {{ n }}
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Drive the review page from the snapshot**

In `app/pages/reviews/[id].vue` `<script setup>`, add reactive answer state derived from the snapshot. After the existing reflection refs (around line 260), add:

```typescript
// Dynamic template-driven answers
const answers = ref<Record<string, string>>({});
const selfScore = ref<number | null>(null);

const snapshotFields = computed(
  () => (review.value?.templateSnapshot ?? []) as Array<{
    id: string;
    type: "long_text" | "multiple_choice" | "section";
    label: string;
    helpText?: string;
    required: boolean;
    options?: string[];
  }>,
);

// Per-field debounce timers
const answerTimers = new Map<string, ReturnType<typeof setTimeout>>();

const saveAnswers = async () => {
  if (!review.value) return;
  try {
    await $api(`/reviews/${reviewId}`, { method: "PATCH", body: { answers: answers.value } });
  } catch (error) {
    console.error("Failed to save answers:", error);
    toast.add({
      title: "Failed to save changes",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

const onAnswerChange = (fieldId: string, value: string) => {
  answers.value = { ...answers.value, [fieldId]: value };
  clearTimeout(answerTimers.get(fieldId));
  answerTimers.set(fieldId, setTimeout(saveAnswers, 800));
};

const saveSelfScore = async (value: number | null) => {
  selfScore.value = value;
  if (!review.value) return;
  try {
    await $api(`/reviews/${reviewId}`, { method: "PATCH", body: { selfScore: value } });
  } catch (error) {
    console.error("Failed to save self-score:", error);
  }
};
```

Extend the existing `watch(() => review.value, ...)` initializer (around line 264) to also seed the new state:

```typescript
      answers.value = { ...(newReview.answers ?? {}) };
      selfScore.value = newReview.selfScore ?? null;
```

- [ ] **Step 4: Replace the hard-coded reflection block in the template**

In `app/pages/reviews/[id].vue`, replace the three hard-coded `<ReviewsReflectionEditor>` blocks (around lines 617-640) with the snapshot-driven loop + self-score:

```vue
        <div class="space-y-6">
          <DynamicReflectionField
            v-for="field in snapshotFields"
            :key="field.id"
            :field="field"
            :model-value="answers[field.id] || ''"
            :readonly="(!isReviewee && !isBuddy) || isCompleted"
            @update:model-value="(v) => onAnswerChange(field.id, v)"
          />

          <SelfScoreField
            :model-value="selfScore"
            :readonly="!isReviewee || isCompleted"
            @update:model-value="saveSelfScore"
          />
        </div>
```

> Keep the buddy comments block and reviewee additional comments block exactly as they are — they are unchanged fixed fields and live outside this loop.

- [ ] **Step 5: Verify build + manual end-to-end check**

Run: `npm run build`
Then `npm run dev`:
1. As an admin, create a "Developer" template with a long-text field, a multiple-choice field ("On track / At risk / Off track"), and a section header.
2. As a buddy, schedule a review for a reviewee using the Developer preset.
3. As the reviewee, open the review: confirm the dynamic fields render (editor, radio group, heading), fill them in, pick a self-score, and confirm they persist on reload.
4. Open an **older** (pre-migration) review and confirm its three legacy reflection answers still render correctly (proves the backfill works through the same code path).

- [ ] **Step 6: Commit**

```bash
git add app/components/reviews/DynamicReflectionField.vue app/components/reviews/SelfScoreField.vue app/pages/reviews/\[id\].vue
git commit -m "feat: render dynamic review reflection fields and self-score"
```

---

## Task 13: Full regression + reporting check

**Files:** none (verification only)

- [ ] **Step 1: Confirm reporting does not read legacy reflection columns directly**

Run: `grep -rn "reflectionLearnings\|reflectionHighlights\|reflectionConcerns" server/api/admin server/api/analytics 2>/dev/null`
Expected: no matches in reporting/analytics endpoints (the spec assumes reports aggregate counts, not reflection content). If any match appears, note it and confirm it still works against migrated data before proceeding.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "test: verify review templates feature end-to-end"
```

---

## Self-Review Notes (for the plan author / reviewer)

- **Spec coverage:** three-tier model (Task 12 + schema Task 3), field palette of 3 types (Task 1/10/12), snapshot+answers data model (Task 2/3/6/7), one-time migration (Task 8), admin builder (Task 9/10), schedule-time dropdown (Task 11), fixed 1–10 self-score (Task 12), protected Default template (Task 5/10), per-field required flag (Task 1, surfaced in UI Task 10/12). All present.
- **Required flag:** stored + shown with an asterisk; **not** hard-enforced server-side in v1 (deliberate YAGNI, matches spec which never requires enforcement).
- **Non-admin buddies:** Task 11 notes the admin-only template list and the graceful fallback; flagged as a known v1 limitation with a clear upgrade path.
- **Type consistency:** `ReviewTemplateField` defined once in `server/schemas/reviewTemplates.ts` and reused by schema, util, and endpoints; the client `Field` interface mirrors it. Field id constants in `DEFAULT_FIELD_IDS` are the single source of truth for the migration mapping.
