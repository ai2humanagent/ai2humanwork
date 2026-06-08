-- Enforce one X account per ai2human wallet/user identity.
-- Run in Supabase SQL Editor after confirming the duplicate checks return no rows.

-- Duplicate checks: these should return zero rows before creating indexes.
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_account_subject_unique
ON users ((x_account->>'subject'))
WHERE NULLIF(x_account->>'subject', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_account_username_unique
ON users (LOWER(x_account->>'username'))
WHERE NULLIF(x_account->>'username', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_address_unique
ON users (LOWER(wallet_address))
WHERE NULLIF(wallet_address, '') IS NOT NULL;
