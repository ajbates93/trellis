-- RLS cutover, prep step (safe with RLS still OFF).
--
-- Give every tenant-content table a column DEFAULT that reads the request's
-- workspace from the session GUC the workspace middleware sets
-- (`app.current_workspace_id`). Any INSERT that omits `workspace_id` then picks
-- up the caller's workspace automatically, which is exactly what the RLS
-- WITH CHECK will require once enforcement is enabled - no per-handler change
-- for the common request path.
--
-- `current_setting(..., true)` (missing_ok = true) returns NULL when the GUC is
-- unset, so paths with no request scope (background tasks, the Slack webhook,
-- detached timers) still insert NULL here - those paths set `workspace_id`
-- explicitly / run under a workspace or bypass wrapper instead. While the
-- column is still nullable and RLS is off, a NULL default is harmless.
ALTER TABLE "achievements" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "buddy_checkins" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "feedback_insights" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "goal_milestones" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "goal_notes" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "onboarding_imports" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);--> statement-breakpoint
ALTER TABLE "review_schedules" ALTER COLUMN "workspace_id" SET DEFAULT current_setting('app.current_workspace_id', true);
