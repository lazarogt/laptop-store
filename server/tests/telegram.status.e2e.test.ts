/// <reference types="jest" />
import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query } from '../src/db.js';
import { ensureUsersTable } from '../src/models/user.model.js';
import { resetTelegramStatusServiceStateForTests } from '../src/services/telegramStatus.service.js';

const app = createApp();

const registerUserWithSession = async (email: string) => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').send({
    name: 'Telegram Status User',
    email,
    password: 'password123',
  });

  return {
    agent,
    userId: response.body.id as number,
  };
};

describe('GET /api/telegram/status', () => {
  beforeAll(async () => {
    await ensureUsersTable();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    resetTelegramStatusServiceStateForTests();
    process.env.SESSION_SECRET = 'phase4-e2e-session-secret';
    delete process.env.TELEGRAM_BOT_USERNAME;
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

  it('returns connected=false and connectUrl for an authenticated unlinked user', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';
    process.env.TELEGRAM_BOT_USERNAME = 'LaptopStoreBot';

    const { agent } = await registerUserWithSession('telegram-unlinked@example.com');
    const response = await agent.get('/api/telegram/status');

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(false);
    expect(response.body.botUsername).toBe('LaptopStoreBot');
    expect(response.body.connectUrl).toMatch(/^https:\/\/t\.me\/LaptopStoreBot\?start=/);
  });

  it('returns connected=true for an authenticated linked user', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';
    process.env.TELEGRAM_BOT_USERNAME = 'LaptopStoreBot';

    const { agent, userId } = await registerUserWithSession('telegram-linked@example.com');
    await query(
      `
        UPDATE users
        SET telegram_chat_id = $2::bigint,
            telegram_bot_started = TRUE
        WHERE id = $1;
      `,
      [userId, '9988776655'],
    );

    const response = await agent.get('/api/telegram/status');

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(true);
    expect(response.body.botUsername).toBe('LaptopStoreBot');
    expect(response.body.connectUrl).toMatch(/^https:\/\/t\.me\/LaptopStoreBot\?start=/);
  });

  it('returns connectUrl=null when TELEGRAM_BOT_TOKEN is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { agent } = await registerUserWithSession('telegram-no-token@example.com');

    const response = await agent.get('/api/telegram/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      connected: false,
      connectUrl: null,
      botUsername: null,
    });
    expect(warnSpy).toHaveBeenCalledWith('[telegram] TELEGRAM_BOT_TOKEN is not configured; connectUrl will be null.');
  });
});
