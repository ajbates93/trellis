ALTER TABLE "users" ADD COLUMN "preferred_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pronouns" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "review_preference" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "communication_preferences" text;