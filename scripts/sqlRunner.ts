import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const resolveDatabaseName = (): string | undefined =>
  process.env.DB_TARGET_NAME?.trim() ||
  (process.env.NODE_ENV === 'test' ? process.env.DB_NAME_TEST?.trim() : '') ||
  process.env.DB_NAME?.trim();

const getDbArgs = (filePath: string): string[] => {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const dbName = resolveDatabaseName();
  const port = process.env.DB_PORT?.trim() || '5432';

  if (!host || !user || !dbName) {
    throw new Error('Missing DB_HOST, DB_USER or DB_NAME/DB_TARGET_NAME in environment.');
  }

  return ['--host', host, '--port', port, '--username', user, '--dbname', dbName, '--file', filePath];
};

/** Executes one SQL file using psql and env-based credentials. */
export const runSqlFile = async (filePath: string): Promise<void> => {
  const password = process.env.DB_PASSWORD?.trim();

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

      reject(new Error(`psql exited with code ${code ?? 'unknown'} for ${path.basename(filePath)}`));
    });
  });
};

/** Executes all .sql files inside one directory in lexical order. */
export const runSqlDirectory = async (directoryPath: string, scopeLabel: string): Promise<void> => {
  if (!existsSync(directoryPath)) {
    console.log(`[${scopeLabel}] directory not found, skipping: ${directoryPath}`);
    return;
  }

  const files = readdirSync(directoryPath)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log(`[${scopeLabel}] no SQL files found in ${directoryPath}`);
    return;
  }

  for (const fileName of files) {
    const filePath = path.join(directoryPath, fileName);
    console.log(`[${scopeLabel}] applying ${fileName}`);
    await runSqlFile(filePath);
  }
};
