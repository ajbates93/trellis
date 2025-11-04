import { db } from "../database/connection";
import { sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);

    const responseTime = Date.now() - startTime;

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      database: {
        status: "connected",
        responseTime: `${responseTime}ms`,
      },
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0", // You can update this with your actual version
    };
  } catch (error) {
    // Set status code to 503 (Service Unavailable)
    setResponseStatus(event, 503);

    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    };
  }
});
