import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getClientIp } from "./client-ip";

function makeEvent(options: {
  xff?: string | string[];
  socket?: string;
}): Parameters<typeof getClientIp>[0] {
  return {
    node: {
      req: {
        headers: options.xff ? { "x-forwarded-for": options.xff } : {},
        socket: { remoteAddress: options.socket ?? "10.0.0.9" },
      },
    },
  } as never;
}

describe("getClientIp", () => {
  const originalHops = process.env.TRUST_PROXY_HOPS;

  beforeEach(() => {
    delete process.env.TRUST_PROXY_HOPS;
  });

  afterEach(() => {
    if (originalHops === undefined) {
      delete process.env.TRUST_PROXY_HOPS;
    } else {
      process.env.TRUST_PROXY_HOPS = originalHops;
    }
  });

  it("defaults to one trusted hop and takes the last XFF entry", () => {
    const event = makeEvent({ xff: "6.6.6.6, 203.0.113.7" });
    expect(getClientIp(event)).toBe("203.0.113.7");
  });

  it("ignores attacker-prepended XFF entries", () => {
    // A client that sends its own X-Forwarded-For only shifts real entries
    // right; with 1 trusted hop the last entry is still what Railway appended.
    const spoofed = makeEvent({ xff: "1.1.1.1, 2.2.2.2, 203.0.113.7" });
    expect(getClientIp(spoofed)).toBe("203.0.113.7");
  });

  it("uses the socket address when no XFF header is present", () => {
    const event = makeEvent({ socket: "192.0.2.4" });
    expect(getClientIp(event)).toBe("192.0.2.4");
  });

  it("uses the socket address with 0 trusted hops even when XFF is sent", () => {
    process.env.TRUST_PROXY_HOPS = "0";
    const event = makeEvent({ xff: "6.6.6.6", socket: "192.0.2.4" });
    expect(getClientIp(event)).toBe("192.0.2.4");
  });

  it("takes the Nth-from-the-end entry with multiple trusted hops", () => {
    process.env.TRUST_PROXY_HOPS = "2";
    const event = makeEvent({ xff: "6.6.6.6, 203.0.113.7, 172.16.0.1" });
    expect(getClientIp(event)).toBe("203.0.113.7");
  });

  it("falls back to the socket address when XFF has fewer entries than trusted hops", () => {
    process.env.TRUST_PROXY_HOPS = "2";
    const event = makeEvent({ xff: "6.6.6.6", socket: "192.0.2.4" });
    expect(getClientIp(event)).toBe("192.0.2.4");
  });

  it("falls back to the default hop count on a malformed TRUST_PROXY_HOPS", () => {
    process.env.TRUST_PROXY_HOPS = "not-a-number";
    const event = makeEvent({ xff: "6.6.6.6, 203.0.113.7" });
    expect(getClientIp(event)).toBe("203.0.113.7");
  });

  it("joins repeated XFF headers before parsing", () => {
    const event = makeEvent({ xff: ["6.6.6.6, 7.7.7.7", "203.0.113.7"] });
    expect(getClientIp(event)).toBe("203.0.113.7");
  });
});
