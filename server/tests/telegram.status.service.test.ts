/// <reference types="jest" />
import { jest } from '@jest/globals';
import { query } from '../src/db.js';
import { createUser, ensureUsersTable } from '../src/models/user.model.js';
import {
  getTelegramStatusForUser,
  resetTelegramStatusServiceStateForTests,
} from '../src/services/telegramStatus.service.js';

describe('telegramStatus.service', () => {
  beforeAll(async () => {
    await ensureUsersTable();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    jest.restoreAllMocks();
    resetTelegramStatusServiceStateForTests();
    delete process.env.TELEGRAM_BOT_USERNAME;
    process.env.SESSION_SECRET = 'phase4-test-session-secret';
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.SESSION_SECRET;
  });

  it('returns connectUrl and botUsername for an unlinked user when bot is configured', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { username: 'LaptopStoreBot' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const user = await createUser({
      email: 'telegram-service-unlinked@example.com',
      name: 'Telegram Service User',
    });

    const result = await getTelegramStatusForUser(user.id);

    expect(result.connected).toBe(false);
    expect(result.botUsername).toBe('LaptopStoreBot');
    expect(result.connectUrl).toMatch(/^https:\/\/t\.me\/LaptopStoreBot\?start=/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns connected=true for a linked user', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'fake-bot-token';
    process.env.TELEGRAM_BOT_USERNAME = 'LaptopStoreBot';

    const user = await createUser({
      email: 'telegram-service-linked@example.com',
      name: 'Linked User',
      telegram_chat_id: '123456789',
      telegram_bot_started: true,
    });

    const result = await getTelegramStatusForUser(user.id);

    expect(result).toEqual({
      connected: true,
      connectUrl: expect.stringMatching(/^https:\/\/t\.me\/LaptopStoreBot\?start=/),
      botUsername: 'LaptopStoreBot',
    });
  });

  it('returns null connectUrl when TELEGRAM_BOT_TOKEN is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const user = await createUser({
      email: 'telegram-service-no-token@example.com',
      name: 'No Token User',
    });

    const result = await getTelegramStatusForUser(user.id);

    expect(result).toEqual({
      connected: false,
      connectUrl: null,
      botUsername: null,
    });
    expect(warnSpy).toHaveBeenCalledWith('[telegram] TELEGRAM_BOT_TOKEN is not configured; connectUrl will be null.');
  });
});
