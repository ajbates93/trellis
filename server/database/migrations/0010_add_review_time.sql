-- Migration: Add time support to review schedules
-- Changes scheduled_date and completed_date from date to timestamp

-- Change scheduled_date from date to timestamp
ALTER TABLE review_schedules
  ALTER COLUMN scheduled_date TYPE timestamp
  USING scheduled_date::timestamp;

-- Change completed_date from date to timestamp
ALTER TABLE review_schedules
  ALTER COLUMN completed_date TYPE timestamp
  USING completed_date::timestamp;

-- Update column comments
COMMENT ON COLUMN review_schedules.scheduled_date IS 'Scheduled date and time for review (timestamp without timezone)';
COMMENT ON COLUMN review_schedules.completed_date IS 'Completed date and time for review (timestamp without timezone)';
