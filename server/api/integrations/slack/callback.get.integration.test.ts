import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import handler from "./callback.get";
import {
  db,
  resetDb,
  seedWorkspace,
  seedUser,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";
import { slackWorkspaces } from "#server/database/schema";

// Real handler + real database: proves the F6 workspace-binding hijack is
// closed at the row level - a captured state completed by another workspace's
// admin cannot rebind an existing slackTeamId mapping, and the binding only
// ever lands on the initiating session's workspace.

const SLACK_CLIENT_SECRET = "integration-client-secret";

// 32-byte hex key for the AES-256-GCM token encryption.
process.env.SLACK_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);

vi.stubGlobal("useRuntimeConfig", () => ({
  slackClientId: "integration-client-id",
  slackClientSecret: SLACK_CLIENT_SECRET,
  slackTokenEncryptionKey: process.env.SLACK_TOKEN_ENCRYPTION_KEY,
  betterAuthUrl: "http://localhost:3000",
  public: { baseUrl: "http://localhost:3000" },
}));

const redirects: string[] = [];
vi.stubGlobal("sendRedirect", (_event: unknown, url: string) => {
  redirects.push(url);
  return undefined;
});

function stubTokenExchange(teamId: string, teamName = "A Team") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          ok: true,
          access_token: "xoxb-secret-token",
          bot_user_id: "UBOT1",
          team: { id: teamId, name: teamName },
        }),
    }),
  );
}

function buildState(workspaceId: string, nonce = "nonce-1") {
  const payload = Buffer.from(
    JSON.stringify({ workspaceId, nonce, timestamp: Date.now() }),
  ).toString("base64");
  const hmac = createHmac("sha256", SLACK_CLIENT_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${hmac}`;
}

function callbackEvent(options: {
  user: Record<string, unknown>;
  state: string;
  cookieNonce?: string | null;
}) {
  const event = createIntegrationEvent({
    method: "GET",
    path: "/api/integrations/slack/callback",
    query: { code: "oauth-code", state: options.state },
    user: options.user,
  });
  if (options.cookieNonce !== null) {
    event.node.req.headers.cookie = `slack_install_nonce=${options.cookieNonce ?? "nonce-1"}`;
  }
  return event;
}

describe("Slack OAuth callback (integration, real DB)", () => {
  beforeEach(async () => {
    await resetDb();
    redirects.length = 0;
  });

  async function seedVictimBinding() {
    const victimWs = await seedWorkspace({ id: "ws-victim" });
    const attackerWs = await seedWorkspace({ id: "ws-attacker" });
    const victimAdmin = await seedUser({
      id: "victim-admin",
      role: "admin",
      workspaceId: victimWs.id,
    });
    const attackerAdmin = await seedUser({
      id: "attacker-admin",
      role: "admin",
      workspaceId: attackerWs.id,
    });
    const [binding] = await db
      .insert(slackWorkspaces)
      .values({
        workspaceId: victimWs.id,
        slackTeamId: "T-VICTIM",
        slackTeamName: "Victim Team",
        accessToken: "victim-encrypted-token",
        botUserId: "UVICTIM",
        installedBy: victimAdmin.id,
      })
      .returning();
    return { victimWs, attackerWs, victimAdmin, attackerAdmin, binding };
  }

  it("refuses to rebind a Slack team owned by another workspace (the F6 hijack)", async () => {
    const { attackerAdmin, attackerWs } = await seedVictimBinding();
    // The attacker completes a Slack authorisation for the victim's team using
    // a state legitimately minted for their own workspace.
    stubTokenExchange("T-VICTIM");

    const event = callbackEvent({
      user: attackerAdmin,
      state: buildState(attackerWs.id),
    });
    await handler(event);

    expect(redirects).toEqual([
      "/settings/integrations?error=slack_team_already_linked",
    ]);

    // The victim's binding is untouched: same workspace, same token.
    const [row] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, "T-VICTIM"));
    expect(row?.workspaceId).toBe("ws-victim");
    expect(row?.accessToken).toBe("victim-encrypted-token");
    expect(row?.installedBy).toBe("victim-admin");
  });

  it("rejects a state whose workspace is not the session user's workspace", async () => {
    const { attackerAdmin, victimWs } = await seedVictimBinding();
    stubTokenExchange("T-NEW");

    // Captured state minted for the victim's workspace, replayed by an admin
    // of a different workspace.
    const event = callbackEvent({
      user: attackerAdmin,
      state: buildState(victimWs.id),
    });
    await handler(event);

    expect(redirects[0]).toContain("/settings/integrations?error=");
    const rows = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, "T-NEW"));
    expect(rows).toHaveLength(0);
  });

  it("rejects a callback without the initiating session's nonce cookie", async () => {
    const { victimAdmin, victimWs } = await seedVictimBinding();
    stubTokenExchange("T-NEW");

    const event = callbackEvent({
      user: victimAdmin,
      state: buildState(victimWs.id),
      cookieNonce: null,
    });
    await handler(event);

    expect(redirects[0]).toContain("/settings/integrations?error=");
    const rows = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, "T-NEW"));
    expect(rows).toHaveLength(0);
  });

  it("installs a fresh Slack team into the initiating admin's workspace", async () => {
    const ws = await seedWorkspace({ id: "ws-fresh" });
    const admin = await seedUser({
      id: "fresh-admin",
      role: "admin",
      workspaceId: ws.id,
    });
    stubTokenExchange("T-FRESH", "Fresh Team");

    const event = callbackEvent({
      user: admin,
      state: buildState(ws.id),
    });
    await handler(event);

    expect(redirects).toEqual(["/settings/integrations?success=slack_installed"]);
    const [row] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, "T-FRESH"));
    expect(row?.workspaceId).toBe("ws-fresh");
    expect(row?.installedBy).toBe("fresh-admin");
    // Token is stored encrypted, never plaintext.
    expect(row?.accessToken).not.toContain("xoxb-secret-token");
  });

  it("allows the same workspace to re-install (token refresh)", async () => {
    const { victimAdmin, victimWs } = await seedVictimBinding();
    stubTokenExchange("T-VICTIM", "Victim Team Renamed");

    const event = callbackEvent({
      user: victimAdmin,
      state: buildState(victimWs.id),
    });
    await handler(event);

    expect(redirects).toEqual(["/settings/integrations?success=slack_installed"]);
    const [row] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, "T-VICTIM"));
    expect(row?.workspaceId).toBe("ws-victim");
    expect(row?.slackTeamName).toBe("Victim Team Renamed");
    expect(row?.accessToken).not.toBe("victim-encrypted-token");
  });
});
