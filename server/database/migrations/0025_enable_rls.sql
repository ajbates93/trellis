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
--    a password is set) so `drizzle-kit migrate` never blocks a deploy. When the
--    role already exists (e.g. hand-created), the security-critical attributes are
--    ALWAYS re-applied so RLS can never be silently bypassed by a role that was
--    created SUPERUSER/BYPASSRLS/NOLOGIN by mistake; the password is only touched
--    when one is supplied.
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
  ELSE
    EXECUTE 'ALTER ROLE trellis_app WITH LOGIN NOSUPERUSER NOBYPASSRLS';
    IF pw IS NOT NULL AND pw <> '' THEN
      EXECUTE format('ALTER ROLE trellis_app WITH PASSWORD %L', pw);
    END IF;
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
--    Driven from a single table list so the policy expression is defined once and
--    can never desync across tables. USING filters reads; WITH CHECK filters
--    writes. Both allow a row when its workspace matches the request's
--    `app.current_workspace_id`, OR when the caller is running under the
--    super-admin/background bypass (`app.is_super_admin = 'on'`).
--    `current_setting(..., true)` returns NULL when unset, so with no context the
--    policy matches nothing (fail closed). FORCE is not used: the owner must keep
--    bypassing so migrations/backfills work.
DO $$
DECLARE
  tbl text;
  content_tables text[] := ARRAY[
    'achievements', 'buddy_checkins', 'feedback', 'feedback_insights',
    'goal_milestones', 'goal_notes', 'goals', 'notifications',
    'onboarding_imports', 'review_schedules'
  ];
BEGIN
  FOREACH tbl IN ARRAY content_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format($policy$
      CREATE POLICY tenant_isolation ON %I
        USING (workspace_id = current_setting('app.current_workspace_id', true)
               OR current_setting('app.is_super_admin', true) = 'on')
        WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
               OR current_setting('app.is_super_admin', true) = 'on')
    $policy$, tbl);
  END LOOP;
END $$;
