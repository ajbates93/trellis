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

  // Define rate limit configurations for different endpoints
  const rateLimitConfig = [
    {
      endpoints: [
        "/api/auth/sign-in",
        "/api/auth/set-password",
        "/api/auth/reset-password",
        "/api/auth/forget-password",
      ],
      maxAttempts: 5,
      windowMinutes: 15,
      errorMessage: (remainingTime: number) =>
        `Too many attempts. Please try again in ${remainingTime} minutes.`,
    },
    {
      endpoints: ["/api/integrations/slack/interactions"],
      maxAttempts: 10,
      windowMinutes: 60,
      errorMessage: (remainingTime: number) =>
        `Too many feedback submissions. Please try again in ${remainingTime} minutes.`,
    },
    {
      endpoints: ["/api/marketing/demo-request"],
      maxAttempts: 5,
      windowMinutes: 60,
      errorMessage: (remainingTime: number) =>
        `Too many demo requests. Please try again in ${remainingTime} minutes.`,
    },
  ];

  // Find matching rate limit config
  const config = rateLimitConfig.find((cfg) =>
    cfg.endpoints.some((endpoint) => path.startsWith(endpoint))
  );

  if (!config) {
    return;
  }

  // Get client identifier (IP address)
  const clientIp =
    event.node.req.headers["x-forwarded-for"] ||
    event.node.req.socket.remoteAddress ||
    "unknown";

  const key = `${clientIp}:${path}`;
  const now = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;

  // Initialize or get existing rate limit
  if (!store[key] || store[key].resetAt < now) {
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
  } else {
    store[key].count++;
  }

  // Check rate limit
  if (store[key].count > config.maxAttempts) {
    const remainingTime = Math.ceil((store[key].resetAt - now) / 60000);
    throw createError({
      statusCode: 429,
      message: config.errorMessage(remainingTime),
    });
  }
});
