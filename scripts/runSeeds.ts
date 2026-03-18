import 'dotenv/config';
import path from 'node:path';
import { runSqlDirectory } from './sqlRunner.js';

const SEEDS_DIR = path.resolve('scripts/seed');

const run = async (): Promise<void> => {
  await runSqlDirectory(SEEDS_DIR, 'seed');
  console.log('[seed] All seed files applied successfully.');
};

run().catch((error) => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
