ALTER TABLE "feedback" DROP CONSTRAINT "feedback_review_schedule_id_review_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "review_schedules" ALTER COLUMN "scheduled_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "review_schedules" ALTER COLUMN "completed_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "review_schedule_id";