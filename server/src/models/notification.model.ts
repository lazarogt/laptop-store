import { query } from '../db.js';

export type NotificationChannel = 'email' | 'telegram';
export type NotificationStatus = 'sent' | 'failed' | 'skipped' | 'ignored';

export interface NotificationLogInput {
  userId?: number | null;
  orderId?: number | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  errorMessage?: string | null;
}

/** Ensures optional notifications audit table exists. */
export const ensureNotificationsTable = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      order_id INTEGER NULL REFERENCES orders(id) ON DELETE SET NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      error_message TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/** Persists one notification attempt for audit/debugging. */
export const createNotificationLog = async (entry: NotificationLogInput): Promise<void> => {
  await query(
    `
      INSERT INTO notifications (user_id, order_id, channel, status, payload, error_message)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6);
    `,
    [
      entry.userId ?? null,
      entry.orderId ?? null,
      entry.channel,
      entry.status,
      JSON.stringify(entry.payload),
      entry.errorMessage ?? null,
    ],
  );
};
