-- Additive patch for wallet session, X binding, and profile photo persistence.
-- Run this in Supabase SQL Editor for the same project used by SUPABASE_URL.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS privy_user_id TEXT,
  ADD COLUMN IF NOT EXISTS x_account JSONB;

ALTER TABLE humans
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sessions'
      AND policyname = 'allow_all'
  ) THEN
    CREATE POLICY "allow_all" ON sessions
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

