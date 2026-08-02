-- RLS cutover, prep step (safe with RLS still OFF).
--
-- Give every tenant-content table a column DEFAULT that reads the request's
-- workspace from the session GUC the workspace middleware sets
-- (`app.current_workspace_id`). Any INSERT that omits `workspace_id` then picks
-- up the caller's workspace automatically, which is what the RLS WITH CHECK will
-- require once enforcement is enabled - no per-handler change for the common path.
--
-- NULLIF(..., '') is deliberate: the middleware binds `workspaceId ?? ''`, so a
-- user whose `users.workspace_id` is NULL (e.g. a workspace-less super admin)
-- would otherwise stamp the empty string and hit the `workspaces` FK. Degrading
-- '' to NULL keeps the column nullable-clean while RLS is off, and fails closed
-- (no matching workspace) once RLS is on. Background/webhook paths with no scope
-- set `workspace_id` explicitly or run under a workspace/bypass wrapper instead.
ALTER TABLE "achievements" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "buddy_checkins" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "feedback_insights" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "goal_milestones" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "goal_notes" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "onboarding_imports" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');--> statement-breakpoint
ALTER TABLE "review_schedules" ALTER COLUMN "workspace_id" SET DEFAULT NULLIF(current_setting('app.current_workspace_id', true), '');