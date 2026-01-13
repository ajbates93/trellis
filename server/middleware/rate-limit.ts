import { defineEventHandler } from "h3";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      Reflect.deleteProperty(store, key);
    }
  });
}, 10 * 60 * 1000);

export default defineEventHandler((event) => {
  const path = event.path;

  // Apply rate limiting only to auth endpoints
  const authEndpoints = [
    "/api/auth/sign-in",
    "/api/auth/set-password",
    "/api/auth/reset-password",
    "/api/auth/forget-password",
  ];

  if (!authEndpoints.some((endpoint) => path.startsWith(endpoint))) {
    return;
  }

  // Get client identifier (IP address)
  const clientIp =
    event.node.req.headers["x-forwarded-for"] ||
    event.node.req.socket.remoteAddress ||
    "unknown";

  const key = `${clientIp}:${path}`;
  const now = Date.now();

  // Initialize or get existing rate limit
  if (!store[key] || store[key].resetAt < now) {
    store[key] = {
      count: 1,
      resetAt: now + 15 * 60 * 1000, // 15 minutes
    };
  } else {
    store[key].count++;
  }

  // Check rate limit (max 5 attempts per 15 minutes)
  if (store[key].count > 5) {
    const remainingTime = Math.ceil((store[key].resetAt - now) / 60000);
    throw createError({
      statusCode: 429,
      message: `Too many attempts. Please try again in ${remainingTime} minutes.`,
    });
  }
});
