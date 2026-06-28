-- AI2Human developer API key request intake.
-- Run this in Supabase before treating /developers/api-keys as production intake.

create table if not exists public.developer_api_key_requests (
  id text primary key,
  project_name text not null,
  contact_name text not null,
  email text not null,
  x_handle text not null,
  website text,
  agent_platform text not null,
  expected_volume text not null,
  reward_budget text not null,
  use_cases text[] not null default '{}',
  needs_webhooks boolean not null default false,
  needs_x402 boolean not null default false,
  wallet_address text,
  notes text,
  status text not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists developer_api_key_requests_status_idx
  on public.developer_api_key_requests (status, created_at desc);

create index if not exists developer_api_key_requests_email_idx
  on public.developer_api_key_requests (email);

create index if not exists developer_api_key_requests_x_handle_idx
  on public.developer_api_key_requests (x_handle);
