-- 20260307_add_telegram_fields.sql
-- Adds Telegram fields to users table and creates required indexes/tables for notifications flow.

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      telegram_chat_id BIGINT NULL,
      telegram_bot_started BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_bot_started BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'created',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  order_id INTEGER NULL REFERENCES orders(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laptops_brand ON laptops (brand);
CREATE INDEX IF NOT EXISTS idx_laptops_price ON laptops (price);
CREATE INDEX IF NOT EXISTS idx_laptops_title_fts ON laptops USING GIN (to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications (order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
