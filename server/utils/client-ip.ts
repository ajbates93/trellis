import type { H3Event } from "h3";

/**
 * Number of reverse proxies in front of the app that append to
 * X-Forwarded-For. On Railway this is 1 (its edge proxy). With N trusted
 * hops, the last N entries of the header were appended by infrastructure we
 * control, so the Nth-from-the-end entry is the real client address; anything
 * further left is attacker-supplied and must be ignored (F5).
 */
function trustedProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw === undefined || raw === "") return 1;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 1;
}

/**
 * Derive the client IP without trusting client-controlled header content.
 *
 * - With 0 trusted hops (direct connection, e.g. local dev), the socket
 *   address is the client.
 * - With N trusted hops, take the Nth-from-the-end X-Forwarded-For entry
 *   (the value the innermost trusted proxy recorded). If the header has
 *   fewer entries than trusted hops, it did not pass through our proxy
 *   chain intact - fall back to the socket address rather than trusting it.
 */
export function getClientIp(event: H3Event): string {
  const socketAddress = event.node.req.socket?.remoteAddress || "unknown";
  const hops = trustedProxyHops();
  if (hops === 0) return socketAddress;

  const header = event.node.req.headers["x-forwarded-for"];
  if (!header) return socketAddress;

  const entries = (Array.isArray(header) ? header.join(",") : header)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length < hops) return socketAddress;
  return entries[entries.length - hops] ?? socketAddress;
}
