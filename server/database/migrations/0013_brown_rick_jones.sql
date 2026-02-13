ALTER TABLE "review_schedules" ADD COLUMN "reminder_sent_7d" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD COLUMN "reminder_sent_1d" boolean DEFAULT false;