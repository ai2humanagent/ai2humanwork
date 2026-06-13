-- Add profile contact email and notification preferences.
-- Run this in Supabase SQL Editor before relying on email notifications.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

UPDATE users
SET
  contact_email = COALESCE(
    NULLIF(contact_email, ''),
    NULLIF(x_account->>'__contactEmail', '')
  ),
  notification_preferences = COALESCE(
    notification_preferences,
    (x_account->'__notificationPreferences')::jsonb,
    '{}'::jsonb
  )
WHERE x_account ? '__contactEmail'
   OR x_account ? '__notificationPreferences';

CREATE INDEX IF NOT EXISTS idx_users_contact_email
ON users (LOWER(contact_email))
WHERE NULLIF(contact_email, '') IS NOT NULL;
