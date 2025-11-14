ALTER TABLE "feedback" ADD COLUMN "review_schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "completion_notes" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_review_schedule_id_review_schedules_id_fk" FOREIGN KEY ("review_schedule_id") REFERENCES "public"."review_schedules"("id") ON DELETE set null ON UPDATE no action;