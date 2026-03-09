import 'dotenv/config';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const MIGRATIONS_DIR = path.resolve('scripts/migrations');

const getPsqlArgs = (filePath: string): string[] => {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const dbName = process.env.DB_NAME;
  const port = process.env.DB_PORT ?? '5432';

  if (!host || !user || !dbName) {
    throw new Error('Missing DB_HOST, DB_USER or DB_NAME in environment.');
  }

  return ['--host', host, '--port', port, '--username', user, '--dbname', dbName, '--file', filePath];
};

const runPsqlFile = async (filePath: string): Promise<void> => {
  const password = process.env.DB_PASSWORD;

  await new Promise<void>((resolve, reject) => {
    const child = spawn('psql', getPsqlArgs(filePath), {
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
      reject(new Error(`Migration failed for ${path.basename(filePath)} with code ${code ?? 'unknown'}`));
    });
  });
};

const run = async (): Promise<void> => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log('[migrate] No migration files found.');
    return;
  }

  for (const fileName of files) {
    const filePath = path.join(MIGRATIONS_DIR, fileName);
    console.log(`[migrate] Applying ${fileName}`);
    await runPsqlFile(filePath);
  }

  console.log('[migrate] All migrations applied successfully.');
};

run().catch((error) => {
  console.error('[migrate] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
