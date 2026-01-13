-- Migration: Add timezone support to users
-- Add timezone column to store user's preferred timezone (IANA format)

ALTER TABLE users
  ADD COLUMN timezone VARCHAR(100);

-- Add comment
COMMENT ON COLUMN users.timezone IS 'User''s preferred timezone in IANA format (e.g., Europe/London, America/New_York). NULL means browser default.';
