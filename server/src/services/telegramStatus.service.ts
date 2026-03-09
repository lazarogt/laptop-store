import crypto from 'node:crypto';
import { getUserById } from '../models/user.model.js';
import { sanitizeString } from '../utils/sanitize.js';

interface TelegramGetMeResponse {
  ok?: boolean;
  result?: {
    username?: string;
  };
  description?: string;
}

export interface TelegramStatusDTO {
  connected: boolean;
  connectUrl: string | null;
  botUsername: string | null;
}

const BOT_USERNAME_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedBotUsername: string | null = null;
let cachedBotUsernameAt = 0;
let missingTokenLogged = false;

const getTelegramApiBase = (): string =>
  (process.env.TELEGRAM_API_BASE?.trim() || 'https://api.telegram.org').replace(/\/+$/, '');

const getConfiguredBotToken = (): string => process.env.TELEGRAM_BOT_TOKEN?.trim() || '';

const getConfiguredBotUsername = (): string => {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim() || '';
  return username ? sanitizeString(username.replace(/^@+/, '')) : '';
};

const getTelegramLinkSecret = (): string | null => {
  const secret =
    process.env.TELEGRAM_LINK_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'dev-insecure-session-secret-change-me';

  return secret || null;
};

const createTelegramStartToken = (userId: number): string | null => {
  const secret = getTelegramLinkSecret();
  if (!secret) {
    return null;
  }

  const issuedAt = Date.now().toString(36);
  const payload = `${userId}:${issuedAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}:${signature}`, 'utf8').toString('base64url');
};

const getBotUsernameFromApi = async (): Promise<string | null> => {
  const botToken = getConfiguredBotToken();
  if (!botToken) {
    if (!missingTokenLogged) {
      console.warn('[telegram] TELEGRAM_BOT_TOKEN is not configured; connectUrl will be null.');
      missingTokenLogged = true;
    }
    return null;
  }

  const now = Date.now();
  if (cachedBotUsernameAt > 0 && now - cachedBotUsernameAt < BOT_USERNAME_CACHE_TTL_MS) {
    return cachedBotUsername;
  }

  const response = await fetch(`${getTelegramApiBase()}/bot${botToken}/getMe`);
  if (!response.ok) {
    console.warn(`[telegram] Unable to resolve bot username from Telegram API (HTTP ${response.status}).`);
    return null;
  }

  const payload = (await response.json()) as TelegramGetMeResponse;
  const username = payload.ok ? payload.result?.username?.trim() || '' : '';

  if (!username) {
    console.warn(
      `[telegram] Telegram API did not return a bot username${payload.description ? ` (${payload.description})` : ''}.`,
    );
    return null;
  }

  cachedBotUsername = sanitizeString(username.replace(/^@+/, ''));
  cachedBotUsernameAt = now;
  return cachedBotUsername;
};

const resolveBotUsername = async (): Promise<string | null> => {
  const configuredUsername = getConfiguredBotUsername();
  if (configuredUsername) {
    return configuredUsername;
  }

  return getBotUsernameFromApi();
};

/** Returns Telegram connection state for one authenticated user. */
export const getTelegramStatusForUser = async (userId: number): Promise<TelegramStatusDTO> => {
  const user = await getUserById(userId);
  if (!user) {
    return {
      connected: false,
      connectUrl: null,
      botUsername: null,
    };
  }

  const connected = Boolean(user.telegram_chat_id);
  const botUsername = await resolveBotUsername();
  if (!botUsername) {
    return {
      connected,
      connectUrl: null,
      botUsername: null,
    };
  }

  const startToken = createTelegramStartToken(userId);
  if (!startToken) {
    console.warn('[telegram] Telegram link secret is not configured; connectUrl will be null.');
    return {
      connected,
      connectUrl: null,
      botUsername,
    };
  }

  return {
    connected,
    connectUrl: `https://t.me/${botUsername}?start=${encodeURIComponent(startToken)}`,
    botUsername,
  };
};

/** Test helper to clear in-memory Telegram bot metadata cache. */
export const resetTelegramStatusServiceStateForTests = (): void => {
  cachedBotUsername = null;
  cachedBotUsernameAt = 0;
  missingTokenLogged = false;
};
