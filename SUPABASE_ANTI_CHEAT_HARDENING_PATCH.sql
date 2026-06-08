-- ai2human anti-cheat hardening
-- Run this in Supabase SQL Editor.
--
-- What this protects:
-- 1. one wallet identity per user row
-- 2. one X account per wallet/user
-- 3. one X / wallet / article URL per article contest task
-- 4. one paid reward per task+wallet for reward campaigns
-- 5. unique on-chain tx hashes and payment idempotency keys
--
-- If any preflight query returns rows, review those duplicates before creating
-- the matching unique index.

-- ---------------------------------------------------------------------------
-- Preflight duplicate checks
-- ---------------------------------------------------------------------------

SELECT
  LOWER(wallet_address) AS wallet,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id) AS user_ids
FROM users
WHERE NULLIF(wallet_address, '') IS NOT NULL
GROUP BY LOWER(wallet_address)
HAVING COUNT(*) > 1;

SELECT
  x_account->>'subject' AS x_subject,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(wallet_address) AS wallets
FROM users
WHERE NULLIF(x_account->>'subject', '') IS NOT NULL
GROUP BY x_account->>'subject'
HAVING COUNT(*) > 1;

SELECT
  LOWER(x_account->>'username') AS x_username,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(wallet_address) AS wallets
FROM users
WHERE NULLIF(x_account->>'username', '') IS NOT NULL
GROUP BY LOWER(x_account->>'username')
HAVING COUNT(*) > 1;

SELECT
  task_id,
  LOWER(wallet_address) AS wallet,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id) AS participant_ids
FROM lucky_draw_participants
WHERE NULLIF(wallet_address, '') IS NOT NULL
GROUP BY task_id, LOWER(wallet_address)
HAVING COUNT(*) > 1;

SELECT
  task_id,
  LOWER(x_handle) AS x_handle,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(wallet_address) AS wallets
FROM lucky_draw_participants
WHERE NULLIF(x_handle, '') IS NOT NULL
GROUP BY task_id, LOWER(x_handle)
HAVING COUNT(*) > 1;

SELECT
  task_id,
  source,
  LOWER(receiver_address) AS receiver,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id) AS payment_ids
FROM payments
WHERE task_id IS NOT NULL
  AND source IN ('twitter_task', 'article_contest')
  AND status = 'paid'
  AND NULLIF(receiver_address, '') IS NOT NULL
GROUP BY task_id, source, LOWER(receiver_address)
HAVING COUNT(*) > 1;

SELECT
  LOWER(tx_hash) AS tx_hash,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id) AS payment_ids
FROM payments
WHERE NULLIF(tx_hash, '') IS NOT NULL
GROUP BY LOWER(tx_hash)
HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------------
-- Schema compatibility
-- ---------------------------------------------------------------------------

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS fallback_order_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- ---------------------------------------------------------------------------
-- Identity constraints
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_address_unique
ON users (LOWER(wallet_address))
WHERE NULLIF(wallet_address, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_account_subject_unique
ON users ((x_account->>'subject'))
WHERE NULLIF(x_account->>'subject', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_account_username_unique
ON users (LOWER(x_account->>'username'))
WHERE NULLIF(x_account->>'username', '') IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Lucky draw / reward campaign constraints
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS lucky_draw_participants_task_wallet_uidx
ON lucky_draw_participants (task_id, LOWER(wallet_address))
WHERE NULLIF(wallet_address, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lucky_draw_participants_task_x_uidx
ON lucky_draw_participants (task_id, LOWER(x_handle))
WHERE NULLIF(x_handle, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_task_source_receiver_uidx
ON payments (task_id, source, LOWER(receiver_address))
WHERE task_id IS NOT NULL
  AND source IN ('twitter_task', 'article_contest')
  AND status = 'paid'
  AND NULLIF(receiver_address, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_tx_hash_uidx
ON payments (LOWER(tx_hash))
WHERE NULLIF(tx_hash, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
ON payments (idempotency_key)
WHERE NULLIF(idempotency_key, '') IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Ranked X article contest constraints
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_wallet_uidx
ON article_submissions (task_id, LOWER(wallet_address));

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_x_uidx
ON article_submissions (task_id, LOWER(x_handle));

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_url_uidx
ON article_submissions (task_id, LOWER(article_url));

CREATE UNIQUE INDEX IF NOT EXISTS article_submissions_task_article_id_uidx
ON article_submissions (task_id, article_id)
WHERE NULLIF(article_id, '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quest_progress_task_wallet_subtask_uidx
ON quest_progress (task_id, LOWER(wallet_address), subtask_key);
