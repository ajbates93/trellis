CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notification_preferences" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "users"
SET "email_notification_preferences" = jsonb_build_object(
  'feedback_received', false,
  'buddy_feedback_received', false,
  'review_created', false,
  'review_rescheduled', false,
  'review_cancelled', false,
  'review_completed', false,
  'review_reminder', false
)
WHERE "email_notifications" = false;
--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" ("user_id", "read_at");
--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at" DESC);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_notifications";