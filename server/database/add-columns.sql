-- Add Better Auth admin plugin columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMP;

-- Drop old isAdmin column if it exists
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;

-- Add impersonatedBy column to session table
ALTER TABLE session ADD COLUMN IF NOT EXISTS impersonated_by TEXT;
