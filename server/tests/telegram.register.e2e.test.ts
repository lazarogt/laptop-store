/// <reference types="jest" />
import request from 'supertest';
import { query } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createUser, ensureUsersTable } from '../src/models/user.model.js';

const app = createApp();

beforeAll(async () => {
  await ensureUsersTable();
});

beforeEach(async () => {
  await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
});

describe('POST /api/telegram/register', () => {
  it('returns 401 when user is not authenticated', async () => {
    const response = await request(app).post('/api/telegram/register').send({ chatId: '123456' });

    expect(response.status).toBe(401);
  });

  it('updates telegram fields for authenticated user', async () => {
    const user = await createUser({
      email: 'telegram-user@example.com',
      name: 'Telegram User',
    });

    const response = await request(app)
      .post('/api/telegram/register')
      .set('x-user-id', String(user.id))
      .send({ chatId: '9988776655' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.telegram_chat_id).toBe('9988776655');
    expect(response.body.data.telegram_bot_started).toBe(true);
  });
});
