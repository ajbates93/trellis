CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- Explicit grant for the restricted app role. 0025's ALTER DEFAULT PRIVILEGES
-- only covers tables created by the same role that ran it; if this migration
-- ever runs as a different DB user, trellis_app would silently lose access and
-- the limiter would fail open on every request. Guarded so environments where
-- the role does not exist (e.g. schema-push test databases) still apply cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trellis_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "rate_limits" TO trellis_app;
  END IF;
END $$;
