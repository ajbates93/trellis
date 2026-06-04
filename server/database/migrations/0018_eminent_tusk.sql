CREATE TABLE "review_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "template_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "answers" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "self_score" integer;--> statement-breakpoint
ALTER TABLE "review_templates" ADD CONSTRAINT "review_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_templates" ADD CONSTRAINT "review_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_template_id_review_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."review_templates"("id") ON DELETE set null ON UPDATE no action;