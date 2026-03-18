import 'dotenv/config';
import path from 'node:path';
import { runSqlDirectory } from './sqlRunner.js';

const MIGRATIONS_DIR = path.resolve('scripts/migrations');

const run = async (): Promise<void> => {
  await runSqlDirectory(MIGRATIONS_DIR, 'migrate');
  console.log('[migrate] All migrations applied successfully.');
};

run().catch((error) => {
  console.error('[migrate] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
