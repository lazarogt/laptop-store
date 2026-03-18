import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as dotenvSafeConfig } from 'dotenv-safe';
import { config as dotenvConfig } from 'dotenv';

let loaded = false;

const resolveEnvPath = (): string => {
  const explicit = process.env.DOTENV_CONFIG_PATH?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const rootEnv = path.resolve('.env');
  const serverSrcEnv = path.resolve('server/src/.env');
  return existsSync(rootEnv) ? rootEnv : serverSrcEnv;
};

/** Loads and validates environment variables. Requires critical vars in production. */
export const loadEnv = (): void => {
  if (loaded) {
    return;
  }

  const envPath = resolveEnvPath();

  if (process.env.NODE_ENV === 'production') {
    dotenvSafeConfig({
      path: envPath,
      example: path.resolve('.env.production.example'),
      allowEmptyValues: true,
    });
  } else {
    dotenvConfig({ path: envPath });
  }

  if (process.env.NODE_ENV === 'production') {
    const requiredInProd = [
      ...(process.env.DATABASE_URL?.trim() ? [] : ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']),
      'JWT_SECRET',
      'SESSION_SECRET',
      'CORS_ORIGIN',
    ];

    const missing = requiredInProd.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    }
  }

  loaded = true;
};

loadEnv();
