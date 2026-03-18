import { query } from '../db.js';

interface HealthCheckResult {
  status: 'ok' | 'error';
  details?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: {
    server: HealthCheckResult;
    db: HealthCheckResult;
    migrations: HealthCheckResult;
  };
}

const REQUIRED_TABLES = ['users', 'products', 'reviews', 'orders', 'notifications', 'laptops'];
const REQUIRED_COLUMNS = [
  { tableName: 'users', columnName: 'telegram_chat_id' },
  { tableName: 'users', columnName: 'telegram_bot_started' },
];

/** Builds a health report covering DB connectivity and expected schema readiness. */
export const getHealthReport = async (): Promise<HealthReport> => {
  const report: HealthReport = {
    status: 'ok',
    checks: {
      server: { status: 'ok' },
      db: { status: 'ok' },
      migrations: { status: 'ok' },
    },
  };

  try {
    await query('SELECT 1;');
  } catch (error) {
    report.status = 'degraded';
    report.checks.db = {
      status: 'error',
      details: error instanceof Error ? error.message : 'database_unreachable',
    };
    report.checks.migrations = {
      status: 'error',
      details: 'schema_not_checked',
    };
    return report;
  }

  const tableResult = await query<{ table_name: string }>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[]);
    `,
    [REQUIRED_TABLES],
  );

  const presentTables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((tableName) => !presentTables.has(tableName));

  const columnResult = await query<{ table_name: string; column_name: string }>(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'users' AND column_name IN ('telegram_chat_id', 'telegram_bot_started'))
        );
    `,
  );

  const presentColumns = new Set(columnResult.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missingColumns = REQUIRED_COLUMNS.filter(
    ({ tableName, columnName }) => !presentColumns.has(`${tableName}.${columnName}`),
  ).map(({ tableName, columnName }) => `${tableName}.${columnName}`);

  if (missingTables.length > 0 || missingColumns.length > 0) {
    report.status = 'degraded';
    report.checks.migrations = {
      status: 'error',
      details: [
        missingTables.length > 0 ? `missing_tables=${missingTables.join(',')}` : '',
        missingColumns.length > 0 ? `missing_columns=${missingColumns.join(',')}` : '',
      ]
        .filter(Boolean)
        .join('; '),
    };
  }

  return report;
};
