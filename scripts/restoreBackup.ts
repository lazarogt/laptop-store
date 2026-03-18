import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runSqlDirectory, runSqlFile } from './sqlRunner.js';

const MIGRATIONS_DIR = path.resolve('scripts/migrations');

const applyMigrations = async (): Promise<void> => {
  await runSqlDirectory(MIGRATIONS_DIR, 'restoreBackup');
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
