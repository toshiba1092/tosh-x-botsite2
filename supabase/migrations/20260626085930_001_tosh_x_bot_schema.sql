/*
# TOSH-X-BOT Database Schema

1. New Tables
- `users`: Stores Deriv account information and premium status
  - id (uuid, primary key)
  - deriv_account_id (text, unique) - The Deriv account ID
  - account_type_active (text) - 'real' or 'demo'
  - is_premium_status (boolean) - Whether user has premium access
  - created_at (timestamp)
  
- `bots`: Stores bot configurations
  - id (uuid, primary key)
  - bot_id (text, unique) - Bot identifier (e.g., 'alpha', 'quantum')
  - bot_name (text) - Display name
  - underlying_strategy (text) - Strategy description
  - is_premium (boolean) - Whether this is a premium bot
  - uses_high_payout_recovery (boolean) - Whether bot uses high-payout recovery engine
  
- `trades`: Stores trade history
  - id (uuid, primary key)
  - user_id (uuid, references users)
  - bot_id (uuid, references bots)
  - contract_id (text) - Deriv contract ID
  - asset_type (text) - e.g., 'EUR/USD'
  - contract_type (text) - e.g., 'CALL', 'PUT'
  - entry_spot (numeric)
  - exit_spot (numeric)
  - buy_price (numeric)
  - gross_payout (numeric)
  - net_profit_loss (numeric)
  - status (text) - 'won', 'lost', 'open'
  - timestamp (timestamp)

2. Security
- Enable RLS on all tables
- Single-tenant policy: Allow anon + authenticated access (no sign-in screen required for basic usage)
- This app uses Deriv OAuth, not Supabase auth, so we use anon policies
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account_id text UNIQUE,
  account_type_active text DEFAULT 'demo',
  is_premium_status boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- Bots table
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id text UNIQUE NOT NULL,
  bot_name text NOT NULL,
  underlying_strategy text NOT NULL,
  is_premium boolean DEFAULT false,
  uses_high_payout_recovery boolean DEFAULT false
);

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bots" ON bots;
CREATE POLICY "anon_select_bots" ON bots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bots" ON bots;
CREATE POLICY "anon_insert_bots" ON bots FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bots" ON bots;
CREATE POLICY "anon_update_bots" ON bots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bots" ON bots;
CREATE POLICY "anon_delete_bots" ON bots FOR DELETE
  TO anon, authenticated USING (true);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  bot_id uuid REFERENCES bots(id) ON DELETE SET NULL,
  contract_id text,
  asset_type text,
  contract_type text,
  entry_spot numeric,
  exit_spot numeric,
  buy_price numeric,
  gross_payout numeric,
  net_profit_loss numeric,
  status text DEFAULT 'open',
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trades" ON trades;
CREATE POLICY "anon_select_trades" ON trades FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trades" ON trades;
CREATE POLICY "anon_insert_trades" ON trades FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trades" ON trades;
CREATE POLICY "anon_update_trades" ON trades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trades" ON trades;
CREATE POLICY "anon_delete_trades" ON trades FOR DELETE
  TO anon, authenticated USING (true);

-- Insert default bots
INSERT INTO bots (bot_id, bot_name, underlying_strategy, is_premium, uses_high_payout_recovery) VALUES
  ('alpha', 'TOSH Alpha Bot', 'Trend-following strategy with EMA crossovers and momentum confirmation on 1-tick intervals', false, true),
  ('quantum', 'TOSH Quantum Bot', 'Volatility breakout strategy with Bollinger Band width expansions and ATR spike analysis', false, true),
  ('velocity', 'TOSH Velocity Bot', 'Short-term hyper-scalping with high-frequency directional momentum detection', false, false),
  ('phantom', 'TOSH Phantom Bot', 'Pattern recognition matching consecutive micro-candle tick signatures for reversals', false, false),
  ('nova', 'TOSH Nova Bot', 'Classic horizontal support/resistance breakout tracking recent high/low boundaries', false, false),
  ('titan', 'TOSH Titan Bot', 'Macro-trend confirmation ensuring trades align with 50-tick market directional velocity', false, false),
  ('matrix', 'TOSH Matrix Bot', 'Multi-indicator consensus requiring EMA, ATR, and momentum confirmation concurrently', true, true),
  ('elite', 'TOSH Elite Bot', 'Advanced multi-layer defense with dynamic trend scalping and adaptive micro-candle confirmations', true, false)
ON CONFLICT (bot_id) DO NOTHING;