import { QueryResultRow } from 'pg';
import { query } from '../db.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeString } from '../utils/sanitize.js';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  telegram_chat_id: string | null;
  telegram_bot_started: boolean;
  created_at: string;
}

interface UserRow extends QueryResultRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  password_hash: string | null;
  telegram_chat_id: string | null;
  telegram_bot_started: boolean;
  created_at: Date | string;
}

export interface AuthUserRecord {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  passwordHash: string;
}

export interface AuthUserPublic {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

const normalizeRole = (value: string | null | undefined): 'user' | 'admin' => (value === 'admin' ? 'admin' : 'user');

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: sanitizeString(row.email),
  name: row.name ? sanitizeString(row.name) : null,
  role: normalizeRole(row.role),
  telegram_chat_id: row.telegram_chat_id,
  telegram_bot_started: row.telegram_bot_started,
  created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
});

/** Ensures users table exists and required Telegram columns are present. */
export const ensureUsersTable = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      telegram_chat_id BIGINT NULL,
      telegram_bot_started BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT NULL;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_bot_started BOOLEAN NOT NULL DEFAULT FALSE;`);
};

/** Creates a user row (intended for tests/local setups). */
export const createUser = async (input: {
  email: string;
  name?: string;
  password_hash?: string;
  role?: 'user' | 'admin';
  telegram_chat_id?: string | null;
  telegram_bot_started?: boolean;
}): Promise<User> => {
  const result = await query<UserRow>(
    `
      INSERT INTO users (email, name, password_hash, role, telegram_chat_id, telegram_bot_started)
      VALUES ($1, $2, $3, $4, $5::bigint, $6)
      RETURNING id, email, name, role, password_hash, telegram_chat_id, telegram_bot_started, created_at;
    `,
    [
      sanitizeString(input.email.trim().toLowerCase()),
      input.name ? sanitizeString(input.name.trim()) : null,
      input.password_hash ?? null,
      input.role ?? 'user',
      input.telegram_chat_id ?? null,
      input.telegram_bot_started ?? false,
    ],
  );

  return toUser(result.rows[0]);
};

/** Retrieves one user by id. */
export const getUserById = async (userId: number): Promise<User | null> => {
  const result = await query<UserRow>(
    `
      SELECT id, email, name, role, password_hash, telegram_chat_id, telegram_bot_started, created_at
      FROM users
      WHERE id = $1;
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return toUser(result.rows[0]);
};

/** Updates the authenticated user's Telegram registration data. */
export const updateTelegramRegistration = async (
  userId: number,
  chatId: string,
): Promise<Pick<User, 'telegram_chat_id' | 'telegram_bot_started'>> => {
  const result = await query<UserRow>(
    `
      UPDATE users
      SET telegram_chat_id = $1::bigint,
          telegram_bot_started = TRUE
      WHERE id = $2
      RETURNING id, email, name, role, password_hash, telegram_chat_id, telegram_bot_started, created_at;
    `,
    [chatId, userId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'User not found');
  }

  const updated = toUser(result.rows[0]);
  return {
    telegram_chat_id: updated.telegram_chat_id,
    telegram_bot_started: updated.telegram_bot_started,
  };
};

const toAuthUserPublic = (row: UserRow): AuthUserPublic => ({
  id: row.id,
  name: row.name ? sanitizeString(row.name) : '',
  email: sanitizeString(row.email),
  role: normalizeRole(row.role),
});

/** Returns auth user record by email including password hash. */
export const getAuthUserByEmail = async (email: string): Promise<AuthUserRecord | null> => {
  const normalizedEmail = sanitizeString(email.trim().toLowerCase());
  const result = await query<UserRow>(
    `
      SELECT id, email, name, role, password_hash, telegram_chat_id, telegram_bot_started, created_at
      FROM users
      WHERE email = $1;
    `,
    [normalizedEmail],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  if (!row.password_hash) {
    return null;
  }

  return {
    ...toAuthUserPublic(row),
    passwordHash: row.password_hash,
  };
};

/** Returns safe auth user payload by id. */
export const getAuthUserPublicById = async (userId: number): Promise<AuthUserPublic | null> => {
  const result = await query<UserRow>(
    `
      SELECT id, email, name, role, password_hash, telegram_chat_id, telegram_bot_started, created_at
      FROM users
      WHERE id = $1;
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return toAuthUserPublic(result.rows[0]);
};

/** Creates a user for auth flows and returns the safe payload. */
export const createAuthUser = async (input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUserPublic> => {
  const result = await query<UserRow>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id, email, name, role, password_hash, telegram_chat_id, telegram_bot_started, created_at;
    `,
    [
      sanitizeString(input.name.trim()),
      sanitizeString(input.email.trim().toLowerCase()),
      input.passwordHash,
    ],
  );

  return toAuthUserPublic(result.rows[0]);
};
