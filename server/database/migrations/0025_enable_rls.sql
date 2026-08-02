-- RLS cutover, ENABLE step.
--
-- Turns on Postgres row-level security as the DB-level tenant-isolation backstop
-- (TRE-44). This migration is owner-run, so it can create the role and policies.
-- It is INERT until the app's runtime connection is switched to the restricted
-- role: the table owner (postgres) always bypasses RLS, so while the app still
-- connects as the owner nothing changes. Enforcement begins when Railway's app
-- DATABASE_URL is pointed at `trellis_app` (see docs/audits/rls-cutover-handoff.md).
--
-- NOT NULL on workspace_id is intentionally NOT set here. The RLS policies below
-- already make any NULL-workspace row invisible to every tenant (fail closed),
-- so isolation does not depend on it; tightening to NOT NULL is a follow-up once
-- the integration harness sets a workspace context on its handler-driven inserts.

-- 1. The restricted application role. Idempotent, and safe to run from an
--    automated deploy: if no password is provided via the trellis.app_role_password
--    setting, the role is created without one (it simply cannot authenticate until
--    a password is set) so `drizzle-kit migrate` never blocks a deploy.
DO $$
DECLARE
  pw text := current_setting('trellis.app_role_password', true);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trellis_app') THEN
    IF pw IS NOT NULL AND pw <> '' THEN
      EXECUTE format('CREATE ROLE trellis_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', pw);
    ELSE
      EXECUTE 'CREATE ROLE trellis_app LOGIN NOSUPERUSER NOBYPASSRLS';
    END IF;
  ELSIF pw IS NOT NULL AND pw <> '' THEN
    EXECUTE format('ALTER ROLE trellis_app WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', pw);
  END IF;
END $$;--> statement-breakpoint

-- 2. Grants. The app touches far more than the ten content tables (auth tables,
--    workspaces, templates, etc.), so grant across the schema and set default
--    privileges so future tables/sequences are covered too. The role is NOT the
--    owner, so it remains subject to RLS.
GRANT USAGE ON SCHEMA public TO trellis_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trellis_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trellis_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trellis_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO trellis_app;--> statement-breakpoint

-- 3. Enable RLS + the tenant-isolation policy on each of the ten content tables.
--    USING filters reads; WITH CHECK filters writes. Both allow a row when its
--    workspace matches the request's `app.current_workspace_id`, OR when the
--    caller is running under the super-admin/background bypass
--    (`app.is_super_admin = 'on'`). `current_setting(..., true)` returns NULL when
--    unset, so with no context the policy matches nothing (fail closed).
--    FORCE is not used: the owner must keep bypassing so migrations/backfills work.
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "achievements";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "achievements"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "buddy_checkins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "buddy_checkins";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "buddy_checkins"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "feedback";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "feedback"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "feedback_insights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "feedback_insights";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "feedback_insights"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "goal_milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "goal_milestones";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "goal_milestones"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "goal_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "goal_notes";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "goal_notes"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "goals";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "goals"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "notifications";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "notifications"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "onboarding_imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "onboarding_imports";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "onboarding_imports"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');--> statement-breakpoint

ALTER TABLE "review_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "review_schedules";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "review_schedules"
  USING (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on')
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
         OR current_setting('app.is_super_admin', true) = 'on');
