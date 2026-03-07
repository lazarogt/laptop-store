import './config/env.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'node:http';
import pool from './db.js';
import { createApp } from './app.js';
import { ensureLaptopsTable } from './models/laptop.model.js';
import { ensureNotificationsTable } from './models/notification.model.js';
import { ensureOrdersTable } from './models/order.model.js';
import { startAdminChatIdAutoDetect } from './services/adminChatDetector.service.js';
import { ensureUsersTable } from './models/user.model.js';

/** Starts the HTTP server after checking DB/table readiness. */
export const startServer = async (port = Number(process.env.PORT ?? 8000)): Promise<Server> => {
  await ensureUsersTable();
  await ensureLaptopsTable();
  await ensureOrdersTable();
  await ensureNotificationsTable();
  startAdminChatIdAutoDetect();

  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[server] ${signal} received, closing resources...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  return server;
};

const isEntryPoint = (): boolean => {
  const currentFile = fileURLToPath(import.meta.url);
  const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return currentFile === entryFile;
};

if (isEntryPoint() && process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('[server] failed to start:', error);
    process.exit(1);
  });
}
