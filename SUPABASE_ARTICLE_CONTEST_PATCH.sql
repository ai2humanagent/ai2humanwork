-- ai2human ranked X article contest support
-- Run this in Supabase SQL Editor before enabling ranked_article_contest tasks in production.

CREATE TABLE IF NOT EXISTS article_submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  user_id TEXT,
  x_handle TEXT NOT NULL,
  article_url TEXT NOT NULL,
  article_id TEXT,
  author_handle TEXT NOT NULL,
  title TEXT NOT NULL,
  content_snapshot TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',
  ai_score REAL,
  ai_review TEXT,
  ai_rubric JSONB,
  rank INTEGER,
  prize_amount TEXT,
  payment_tx_hash TEXT,
  payment_explorer_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_wallet_uidx
  ON article_submissions (task_id, lower(wallet_address));

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_x_uidx
  ON article_submissions (task_id, lower(x_handle));

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_url_uidx
  ON article_submissions (task_id, lower(article_url));

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_article_id_uidx
  ON article_submissions (task_id, article_id)
  WHERE NULLIF(article_id, '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS article_submissions_task_status_idx
  ON article_submissions (task_id, status);

CREATE INDEX IF NOT EXISTS article_submissions_task_rank_idx
  ON article_submissions (task_id, rank);

ALTER TABLE article_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'article_submissions'
      AND policyname = 'allow_all'
  ) THEN
    CREATE POLICY "allow_all" ON article_submissions
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
