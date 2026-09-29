import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

const scope = { marker: "scope" };
const enterRequestScope = vi.fn(() => scope);
const bindWorkspaceToScope = vi.fn().mockResolvedValue(undefined);
const releaseRequestScope = vi.fn().mockResolvedValue(undefined);

vi.mock("#server/database/connection", () => ({
  enterRequestScope,
  bindWorkspaceToScope,
  releaseRequestScope,
}));

const { default: handler } = await import("./z-workspace-scope");

function mockEvent(user: unknown, path = "/api/goals") {
  const res = new EventEmitter();
  return { event: { path, context: { user }, node: { res } }, res };
}

describe("z-workspace-scope middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing for an unauthenticated request", async () => {
    const { event } = mockEvent(undefined);
    await handler(event as never);
    expect(enterRequestScope).not.toHaveBeenCalled();
    expect(bindWorkspaceToScope).not.toHaveBeenCalled();
  });

  it("does not reserve a connection for a server-rendered page", async () => {
    const { event } = mockEvent({ workspaceId: "ws1" }, "/dashboard");
    await handler(event as never);
    expect(enterRequestScope).not.toHaveBeenCalled();
    expect(bindWorkspaceToScope).not.toHaveBeenCalled();
  });

  it("binds the caller's workspace and releases on response close", async () => {
    const { event, res } = mockEvent({ workspaceId: "ws1", isSuperAdmin: false });
    await handler(event as never);

    expect(bindWorkspaceToScope).toHaveBeenCalledWith(scope, {
      workspaceId: "ws1",
      isSuperAdmin: false,
    });
    // Not released until the response closes.
    expect(releaseRequestScope).not.toHaveBeenCalled();

    res.emit("close");
    expect(releaseRequestScope).toHaveBeenCalledWith(scope);
  });

  it("passes the super-admin flag and a null workspace through", async () => {
    const { event } = mockEvent({ workspaceId: null, isSuperAdmin: true });
    await handler(event as never);
    expect(bindWorkspaceToScope).toHaveBeenCalledWith(scope, {
      workspaceId: null,
      isSuperAdmin: true,
    });
  });
});
