import 'dotenv/config';
import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve('scripts/migrations');

const getDbArgs = (filePath: string): string[] => {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const dbName = process.env.DB_NAME;
  const port = process.env.DB_PORT ?? '5432';

  if (!host || !user || !dbName) {
    throw new Error('Missing DB_HOST, DB_USER or DB_NAME in environment.');
  }

  return ['--host', host, '--port', port, '--username', user, '--dbname', dbName, '--file', filePath];
};

const runSqlFile = async (filePath: string): Promise<void> => {
  const password = process.env.DB_PASSWORD;

  await new Promise<void>((resolve, reject) => {
    const child = spawn('psql', getDbArgs(filePath), {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(password ? { PGPASSWORD: password } : {}),
      },
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`psql exited with code ${code ?? 'unknown'}`));
    });
  });
};

const applyMigrations = async (): Promise<void> => {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.log('[restoreBackup] migrations folder not found, skipping.');
    return;
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of files) {
    const filePath = path.join(MIGRATIONS_DIR, fileName);
    console.log(`[restoreBackup] applying migration ${fileName}`);
    await runSqlFile(filePath);
  }
};

/**
 * Restores a PostgreSQL dump using psql and environment-based credentials.
 * Usage:
 *  - npm run restore -- /path/to/backup.sql
 *  - npm run restore -- /path/to/backup.sql --migrate
 */
const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const sqlPathArg = args.find((arg) => !arg.startsWith('--'));
  const withMigrations = args.includes('--migrate') || args.includes('--with-migrations');

  if (!sqlPathArg) {
    throw new Error('Usage: npm run restore -- <path-to-backup.sql> [--migrate]');
  }

  const resolvedPath = path.resolve(sqlPathArg);

  if (!existsSync(resolvedPath)) {
    throw new Error(`SQL file not found: ${resolvedPath}`);
  }

  console.log(`[restoreBackup] restoring ${resolvedPath}`);
  await runSqlFile(resolvedPath);

  if (withMigrations) {
    await applyMigrations();
  }
};

run().catch((error) => {
  console.error('[restoreBackup] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
