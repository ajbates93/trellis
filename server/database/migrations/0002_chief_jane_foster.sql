ALTER TABLE "feedback" ADD COLUMN "published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "published_by" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;