ALTER TABLE "achievements" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "buddy_checkins" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "feedback_insights" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "goal_notes" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "onboarding_imports" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_checkins" ADD CONSTRAINT "buddy_checkins_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_insights" ADD CONSTRAINT "feedback_insights_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_notes" ADD CONSTRAINT "goal_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_imports" ADD CONSTRAINT "onboarding_imports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;