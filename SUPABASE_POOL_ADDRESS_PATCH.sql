-- Optional normalization patch for on-chain reward tasks.
-- Current code also supports campaign.poolAddress, so this patch is not required
-- before creating or testing a prize-pool-backed activity.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS pool_address TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_pool_address ON tasks(pool_address);
