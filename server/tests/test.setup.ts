import { afterAll } from '@jest/globals';
import pool from '../src/db.js';

process.env.SMTP_HOST = '';
process.env.SMTP_PORT = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.EMAIL_FROM = 'test@laptop-store.local';
process.env.ADMIN_EMAIL = 'admin@store.test';
process.env.ADMIN_EMAILS = 'admin@store.test';

afterAll(async () => {
  await pool.end();
});
