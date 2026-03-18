import './config/env.js';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import logger from './logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const databaseUrl = process.env.DATABASE_URL;
let parsedUrl: URL | null = null;

if (databaseUrl) {
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    if (!isProduction) {
      console.warn('[db] Ignoring invalid DATABASE_URL value');
    }
  }
}

const config = {
  host: process.env.DB_HOST ?? parsedUrl?.hostname,
  port: parseInteger(process.env.DB_PORT ?? parsedUrl?.port, 5432),
  user: process.env.DB_USER ?? parsedUrl?.username,
  password: process.env.DB_PASSWORD ?? parsedUrl?.password,
  database:
    (isTest ? process.env.DB_NAME_TEST : undefined) ??
    process.env.DB_NAME ??
    parsedUrl?.pathname.replace(/^\//, ''),
  max: parseInteger(process.env.DB_MAX, 10),
  idleTimeoutMillis: parseInteger(process.env.DB_IDLE_TIMEOUT, 30_000),
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: isTest,
  ssl:
    process.env.DB_SSL?.trim() === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED?.trim() === 'true',
        }
      : undefined,
};

if (!config.host || !config.user || !config.database) {
  throw new Error(
    'Database configuration is incomplete. Define DB_HOST, DB_USER and DB_NAME (or DATABASE_URL).',
  );
}

/** Shared PostgreSQL pool for the API. */
const pool = new Pool(config);

pool.on('error', (error) => {
  logger.error({ scope: 'db', err: error }, 'Unexpected error on idle PostgreSQL client');
});

if (!isProduction) {
  pool.on('connect', () => {
    logger.debug({ scope: 'db' }, 'PostgreSQL client connected');
  });
}

const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', '57P01', '57P02', '57P03']);

const isRetryable = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: string }).code;
  return typeof code === 'string' && RETRYABLE_CODES.has(code);
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Executes a SQL query with optional parameters.
 * Retries once on transient connection errors.
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> => {
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= 1; attempt += 1) {
    try {
      const result = await pool.query<T>(text, params);

      if (!isProduction) {
        const elapsedMs = Date.now() - startedAt;
        const statement = text.trim().split(/\s+/)[0]?.toUpperCase() ?? 'SQL';
        logger.debug({ scope: 'db', statement, elapsedMs }, 'SQL query completed');
      }

      return result;
    } catch (error) {
      if (attempt === 0 && isRetryable(error)) {
        if (!isProduction) {
          logger.warn(
            { scope: 'db', code: (error as { code?: string }).code },
            'Transient database error, retrying once',
          );
        }
        await delay(150);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Database query failed after retry.');
};

/** Gets a dedicated client for transaction control. */
export const getClient = async (): Promise<PoolClient> => {
  for (let attempt = 0; attempt <= 1; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      if (attempt === 0 && isRetryable(error)) {
        await delay(150);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unable to get PostgreSQL client after retry.');
};

export default pool;
