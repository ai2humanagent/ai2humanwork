-- Rate limiting for claim API
CREATE TABLE IF NOT EXISTS claim_rate_limits (
  wallet_address TEXT NOT NULL,
  task_id TEXT NOT NULL,
  last_claimed_at TIMESTAMPTZ DEFAULT now(),
  claim_count INTEGER DEFAULT 1,
  PRIMARY KEY (wallet_address, task_id)
);

-- CAPTCHA tokens for claim verification
CREATE TABLE IF NOT EXISTS claim_captcha_tokens (
  token TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  task_id TEXT NOT NULL,
  word TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '5 minutes',
  used BOOLEAN DEFAULT false
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_claim_rate_limits_wallet ON claim_rate_limits(wallet_address);
