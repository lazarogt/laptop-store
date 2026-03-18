INSERT INTO users (name, email, password_hash, role, telegram_bot_started)
VALUES (
  'Local Admin',
  COALESCE(NULLIF(current_setting('app.seed_admin_email', true), ''), 'admin@example.com'),
  'seed_admin_password_hash_placeholder',
  'admin',
  FALSE
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = 'admin';
