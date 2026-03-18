/// <reference types="jest" />
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import {
  detectAdminChatIdOnce,
  resetAdminChatDetectorStateForTests,
} from '../src/services/adminChatDetector.service.js';

describe('adminChatDetector.service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    resetAdminChatDetectorStateForTests();
    process.env.NODE_ENV = 'development';
    process.env.TELEGRAM_BOT_TOKEN = 'fake-token';
    delete process.env.ADMIN_CHAT_ID;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
  });

  afterEach(() => {
    delete process.env.ADMIN_CHAT_ENV_FILE;
  });

  it('detects first chat id, stores ADMIN_CHAT_ID in .env file and sends confirmation', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'admin-chat-detector-'));
    const envFile = path.join(tempDir, '.env');
    writeFileSync(envFile, 'TELEGRAM_BOT_TOKEN=fake-token\n', 'utf8');
    process.env.ADMIN_CHAT_ENV_FILE = envFile;

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, result: [{ update_id: 1, message: { chat: { id: 123456789 } } }] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        ) as typeof fetch,
    );

    const result = await detectAdminChatIdOnce();

    expect(result).toEqual({ detected: true, saved: true, chatId: '123456789' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toContain('/getUpdates');
    expect(fetchSpy.mock.calls[1][0]).toContain('/sendMessage');

    const envContent = readFileSync(envFile, 'utf8');
    expect(envContent).toContain('ADMIN_CHAT_ID=123456789');
  });

  it('does not overwrite ADMIN_CHAT_ID when it already exists in .env', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'admin-chat-detector-existing-'));
    const envFile = path.join(tempDir, '.env');
    writeFileSync(envFile, 'ADMIN_CHAT_ID=777777\n', 'utf8');
    process.env.ADMIN_CHAT_ENV_FILE = envFile;

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: [{ update_id: 1, message: { chat: { id: 999999 } } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await detectAdminChatIdOnce();

    expect(result.saved).toBe(false);
    expect(result.reason).toBe('ADMIN_CHAT_ID already configured');
    expect(fetchSpy).toHaveBeenCalledTimes(0);

    const envContent = readFileSync(envFile, 'utf8');
    expect(envContent).toContain('ADMIN_CHAT_ID=777777');
    expect(envContent).not.toContain('999999');
  });
});
