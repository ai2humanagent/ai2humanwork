-- Fix Supabase tables to match app TypeScript types
-- Run this in Supabase Dashboard → SQL Editor

-- Drop and recreate tables with correct column names matching app types

DROP TABLE IF EXISTS escrow_deposits CASCADE;
DROP TABLE IF EXISTS lucky_draw_participants CASCADE;
DROP TABLE IF EXISTS quest_progress CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS humans CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS waitlist CASCADE;

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  human_id TEXT,
  wallet_address TEXT,
  auth_provider TEXT,
  privy_user_id TEXT,
  x_account JSONB
);

-- Humans
CREATE TABLE humans (
  id TEXT PRIMARY KEY,
  name TEXT,
  handle TEXT UNIQUE,
  role TEXT DEFAULT '',
  location TEXT DEFAULT '',
  city TEXT DEFAULT 'Unknown',
  country TEXT DEFAULT 'Unknown',
  verified BOOLEAN DEFAULT false,
  rating REAL DEFAULT 4.0,
  completed_jobs INTEGER DEFAULT 0,
  hourly_rate REAL DEFAULT 30,
  skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  avatar_seed INTEGER DEFAULT 1,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  budget TEXT DEFAULT '0',
  deadline TIMESTAMPTZ,
  acceptance TEXT DEFAULT '',
  task_type TEXT,
  status TEXT DEFAULT 'created',
  task_state TEXT DEFAULT 'open',
  evidence JSONB DEFAULT '[]',
  agent_id TEXT,
  reward_distribution JSONB,
  escrow_deposit_id TEXT,
  assignee JSONB,
  draw_result JSONB,
  campaign JSONB,
  pool_address TEXT,
  verify_cooldown_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quest Progress
CREATE TABLE quest_progress (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  task_id TEXT NOT NULL,
  subtask_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, wallet_address, subtask_key)
);

-- Payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  fallback_order_id TEXT,
  idempotency_key TEXT,
  amount TEXT,
  receiver TEXT,
  receiver_address TEXT,
  payer_address TEXT,
  method TEXT,
  status TEXT DEFAULT 'paid',
  source TEXT,
  network TEXT,
  chain_id INTEGER,
  token_symbol TEXT,
  token_address TEXT,
  tx_hash TEXT,
  explorer_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT,
  title TEXT,
  body TEXT,
  task_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lucky Draw Participants
CREATE TABLE lucky_draw_participants (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  x_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Escrow Deposits (maps to app EscrowDeposit type)
CREATE TABLE escrow_deposits (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  agent_id TEXT,
  agent_wallet TEXT,
  total_pool TEXT,
  amount_paid_out TEXT DEFAULT '0',
  amount_refunded TEXT DEFAULT '0',
  paid_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  deposit_tx_hash TEXT,
  deposit_explorer_url TEXT,
  refund_tx_hash TEXT,
  refund_explorer_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services (maps to app HumanService type)
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  provider_id TEXT,
  title TEXT,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  price REAL DEFAULT 0,
  pricing TEXT DEFAULT 'fixed',
  duration_minutes INTEGER DEFAULT 30,
  verified BOOLEAN DEFAULT false,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Waitlist
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions (maps to app AuthSession type)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS (Row Level Security) - allow all for now with service role
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE humans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_draw_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations with service role (bypasses RLS)
CREATE POLICY "allow_all" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON humans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON quest_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON lucky_draw_participants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON escrow_deposits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON waitlist FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
