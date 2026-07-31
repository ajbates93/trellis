-- Backfill workspace_id on the tenant content tables from each row's owning
-- user's workspace. This is the tenant-isolation backstop groundwork (TRE-44):
-- the column was added nullable in 0022; here we populate existing rows. A
-- later migration makes it NOT NULL once every write path sets it, and RLS is
-- enabled on top.
--
-- Every statement is idempotent (WHERE workspace_id IS NULL), so this is safe
-- to re-run and safe on a fresh/empty database (it simply updates nothing).

-- Direct user link: workspace comes from the owning user.
UPDATE "goals" g SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE g."user_id" = u."id" AND g."workspace_id" IS NULL;

UPDATE "review_schedules" r SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE r."user_id" = u."id" AND r."workspace_id" IS NULL;

UPDATE "buddy_checkins" b SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE b."user_id" = u."id" AND b."workspace_id" IS NULL;

UPDATE "feedback_insights" fi SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE fi."user_id" = u."id" AND fi."workspace_id" IS NULL;

UPDATE "achievements" a SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE a."user_id" = u."id" AND a."workspace_id" IS NULL;

UPDATE "notifications" n SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE n."user_id" = u."id" AND n."workspace_id" IS NULL;

UPDATE "onboarding_imports" oi SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE oi."admin_id" = u."id" AND oi."workspace_id" IS NULL;

-- Feedback belongs to the tenant whose feedback it is: derive from the reviewee.
UPDATE "feedback" f SET "workspace_id" = u."workspace_id"
  FROM "users" u WHERE f."reviewee_id" = u."id" AND f."workspace_id" IS NULL;

-- Milestones and notes derive via their parent goal (which was backfilled above).
UPDATE "goal_milestones" gm SET "workspace_id" = g."workspace_id"
  FROM "goals" g WHERE gm."goal_id" = g."id" AND gm."workspace_id" IS NULL;

UPDATE "goal_notes" gn SET "workspace_id" = g."workspace_id"
  FROM "goals" g WHERE gn."goal_id" = g."id" AND gn."workspace_id" IS NULL;
