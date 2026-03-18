/// <reference types="jest" />
import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { createUser } from '../src/models/user.model.js';
import { resetTelegramStatusServiceStateForTests } from '../src/services/telegramStatus.service.js';

const app = createApp();

const createdUserIds: number[] = [];

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const adminHeadersForUser = (userId: number) => ({
  'x-user-id': String(userId),
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
});

describe('GET /api/telegram/status', () => {
beforeAll(async () => {
  const result = await query<{ name: string | null }>(`SELECT to_regclass($1) AS name;`, ['public.users']);
  if (!result.rows[0]?.name) {
    throw new Error('Required table missing: users');
  }
});

  beforeEach(async () => {
    resetTelegramStatusServiceStateForTests();
    process.env.SESSION_SECRET = 'phase4-e2e-session-secret';
    delete process.env.TELEGRAM_BOT_USERNAME;
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
    }
    createdUserIds.length = 0;
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_USERNAME;
    delete process.env.SESSION_SECRET;
  });

  it('returns 401 when user is not authenticated', async () => {
    const response = await request(app).get('/api/telegram/status');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication required' });
  });

  it('returns 403 for non-admin users', async () => {
    const user = await createUser({ email: uniqueEmail('telegram-user'), name: 'Telegram User' });
    createdUserIds.push(user.id);
    const response = await request(app)
      .get('/api/telegram/status')
      .set('x-user-id', String(user.id))
      .set('x-user-role', 'user');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Forbidden' });
  });

  it('returns connected=false and connectUrl for an authenticated admin user', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';
    process.env.TELEGRAM_BOT_USERNAME = 'LaptopStoreBot';

    const user = await createUser({ email: uniqueEmail('telegram-unlinked'), name: 'Telegram User' });
    createdUserIds.push(user.id);
    const response = await request(app).get('/api/telegram/status').set(adminHeadersForUser(user.id));

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(false);
    expect(response.body.botUsername).toBe('LaptopStoreBot');
    expect(response.body.connectUrl).toMatch(/^https:\/\/t\.me\/LaptopStoreBot\?start=/);
  });

  it('returns connected=true for an authenticated admin user with chat id', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';
    process.env.TELEGRAM_BOT_USERNAME = 'LaptopStoreBot';

    const user = await createUser({ email: uniqueEmail('telegram-linked'), name: 'Telegram User' });
    createdUserIds.push(user.id);
    await query(
      `
        UPDATE users
        SET telegram_chat_id = $2::bigint,
            telegram_bot_started = TRUE
        WHERE id = $1;
      `,
      [user.id, '9988776655'],
    );

    const response = await request(app).get('/api/telegram/status').set(adminHeadersForUser(user.id));

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(true);
    expect(response.body.botUsername).toBe('LaptopStoreBot');
    expect(response.body.connectUrl).toMatch(/^https:\/\/t\.me\/LaptopStoreBot\?start=/);
  });

  it('returns connectUrl=null when TELEGRAM_BOT_TOKEN is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = await createUser({ email: uniqueEmail('telegram-no-token'), name: 'Telegram User' });
    createdUserIds.push(user.id);
    const response = await request(app).get('/api/telegram/status').set(adminHeadersForUser(user.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      connected: false,
      connectUrl: null,
      botUsername: null,
    });
    expect(warnSpy).toHaveBeenCalledWith('[telegram] TELEGRAM_BOT_TOKEN is not configured; connectUrl will be null.');
  });
});
