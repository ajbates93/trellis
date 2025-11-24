CREATE TABLE "buddy_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buddy_id" text NOT NULL,
	"user_id" text NOT NULL,
	"notes" text NOT NULL,
	"review_schedule_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "buddy_checkins" ADD CONSTRAINT "buddy_checkins_buddy_id_users_id_fk" FOREIGN KEY ("buddy_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_checkins" ADD CONSTRAINT "buddy_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_checkins" ADD CONSTRAINT "buddy_checkins_review_schedule_id_review_schedules_id_fk" FOREIGN KEY ("review_schedule_id") REFERENCES "public"."review_schedules"("id") ON DELETE set null ON UPDATE no action;