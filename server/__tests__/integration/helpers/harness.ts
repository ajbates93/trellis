import { sql } from "drizzle-orm";
import { createEvent, type H3Event } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { db, client } from "#server/database/connection";
import {
  workspaces,
  users,
  goals,
  goalMilestones,
  reviewSchedules,
} from "#server/database/schema";

// The REAL query layer, connected to the disposable test database (see
// integration/setup.ts). Unlike the unit tests, nothing here is mocked: query
// predicates, workspace scoping and validation all execute for real, which is
// the whole point of this tier (see CQ-5).
export { db, client };

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Truncate every public table so each test starts from empty. */
export async function resetDb(): Promise<void> {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const list = Array.from(rows as Iterable<{ tablename: string }>)
    .map((r) => `"${r.tablename}"`)
    .join(", ");
  if (list) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`));
  }
}

export async function seedWorkspace(
  overrides: Partial<typeof workspaces.$inferInsert> = {},
) {
  const id = overrides.id ?? uid("ws");
  const [row] = await db
    .insert(workspaces)
    .values({ id, name: `Workspace ${id}`, ...overrides })
    .returning();
  if (!row) throw new Error("seedWorkspace: insert returned no row");
  return row;
}

export async function seedUser(
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const id = overrides.id ?? uid("user");
  const now = new Date();
  const [row] = await db
    .insert(users)
    .values({
      id,
      email: overrides.email ?? `${id}@example.com`,
      name: overrides.name ?? `User ${id}`,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("seedUser: insert returned no row");
  return row;
}

export async function seedGoal(
  userId: string,
  overrides: Partial<typeof goals.$inferInsert> = {},
) {
  const [row] = await db
    .insert(goals)
    .values({ userId, goalText: "A seeded development goal", ...overrides })
    .returning();
  if (!row) throw new Error("seedGoal: insert returned no row");
  return row;
}

export async function seedGoalMilestone(
  goalId: string,
  overrides: Partial<typeof goalMilestones.$inferInsert> = {},
) {
  const [row] = await db
    .insert(goalMilestones)
    .values({
      goalId,
      title: "A seeded milestone",
      displayOrder: 0,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("seedGoalMilestone: insert returned no row");
  return row;
}

export async function seedReviewSchedule(
  userId: string,
  buddyId: string,
  overrides: Partial<typeof reviewSchedules.$inferInsert> = {},
) {
  const [row] = await db
    .insert(reviewSchedules)
    .values({
      userId,
      buddyId,
      scheduledDate: new Date().toISOString(),
      status: "scheduled",
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("seedReviewSchedule: insert returned no row");
  return row;
}

interface IntegrationEventOptions {
  method?: string;
  path?: string;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
  user?: Record<string, unknown> | null;
  workspace?: { id: string; name?: string } | null;
}

/**
 * Build an H3 event backed by a real request stream, so handlers that call the
 * unmocked readBody()/getQuery() work end to end. The authenticated user is
 * placed on the context exactly as the auth middleware does in production.
 */
export function createIntegrationEvent(
  options: IntegrationEventOptions = {},
): H3Event {
  const {
    method = "GET",
    path = "/",
    body,
    query = {},
    params = {},
    user,
    workspace,
  } = options;

  const qs = new URLSearchParams(query).toString();
  const url = qs ? `${path}?${qs}` : path;

  const socket = new Socket();
  const req = new IncomingMessage(socket);
  req.method = method;
  req.url = url;
  req.headers.host = "localhost";

  const res = new ServerResponse(req);
  const event = createEvent(req, res);

  if (body !== undefined) {
    req.headers["content-type"] = "application/json";
    // h3's readRawBody reads event._requestBody first (see h3 readRawBody):
    // supplying it directly is the supported way to give a mocked event a body,
    // rather than driving the Node request stream by hand.
    (event as unknown as { _requestBody: string })._requestBody =
      JSON.stringify(body);
  }

  event.context.params = params;
  if (user) {
    event.context.user = user;
    event.context.session = { user };
  }
  if (workspace) {
    event.context.workspace = workspace;
  }

  return event;
}
