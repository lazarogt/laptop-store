/// <reference types="jest" />
import request from 'supertest';
import { query } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createUser } from '../src/models/user.model.js';

const app = createApp();

const createdUserIds: number[] = [];

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

beforeAll(async () => {
  const result = await query<{ name: string | null }>(`SELECT to_regclass($1) AS name;`, ['public.users']);
  if (!result.rows[0]?.name) {
    throw new Error('Required table missing: users');
  }
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
  }
  createdUserIds.length = 0;
});

describe('POST /api/telegram/register', () => {
  it('returns 401 when user is not authenticated', async () => {
    const response = await request(app).post('/api/telegram/register').send({ chatId: '123456' });

    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    const user = await createUser({
      email: uniqueEmail('telegram-user'),
      name: 'Telegram User',
    });
    createdUserIds.push(user.id);

    const response = await request(app)
      .post('/api/telegram/register')
      .set('x-user-id', String(user.id))
      .set('x-user-role', 'user')
      .send({ chatId: '9988776655' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Forbidden' });
  });

  it('updates telegram fields for authenticated admin user', async () => {
    const user = await createUser({
      email: uniqueEmail('telegram-user'),
      name: 'Telegram User',
    });
    createdUserIds.push(user.id);

    const response = await request(app)
      .post('/api/telegram/register')
      .set('x-user-id', String(user.id))
      .set('x-user-role', 'admin')
      .set('x-user-email', 'admin@example.com')
      .send({ chatId: '9988776655' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.telegram_chat_id).toBe('9988776655');
    expect(response.body.data.telegram_bot_started).toBe(true);
  });
});
