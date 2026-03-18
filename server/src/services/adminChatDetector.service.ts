import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat?: {
      id?: number | string;
    };
  };
  edited_message?: {
    chat?: {
      id?: number | string;
    };
  };
}

interface TelegramUpdatesResponse {
  ok: boolean;
  result?: TelegramUpdate[];
}

let updatesOffset = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const POLL_INTERVAL_MS = Number.parseInt(process.env.ADMIN_CHAT_DETECT_POLL_MS ?? '5000', 10);

const getTelegramBotToken = (): string => process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';

const getTelegramApiBase = (): string =>
  (process.env.TELEGRAM_API_BASE?.trim() || 'https://api.telegram.org').replace(/\/+$/, '');

const resolveEnvFilePath = (): string => {
  const explicit = process.env.ADMIN_CHAT_ENV_FILE?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const projectEnv = path.resolve('.env');
  const serverSrcEnv = path.resolve('server/src/.env');

  if (existsSync(projectEnv)) {
    return projectEnv;
  }

  if (existsSync(serverSrcEnv)) {
    return serverSrcEnv;
  }

  return projectEnv;
};

const readExistingAdminChatIdFromEnvFile = (): string => {
  const envFile = resolveEnvFilePath();
  if (!existsSync(envFile)) {
    return '';
  }

  const content = readFileSync(envFile, 'utf8');
  const match = content.match(/^ADMIN_CHAT_ID\s*=\s*([^\n#\r]+)/m);
  return match?.[1]?.trim() ?? '';
};

const getConfiguredAdminChatId = (): string => {
  return (
    process.env.ADMIN_CHAT_ID?.trim() ||
    readExistingAdminChatIdFromEnvFile() ||
    process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ||
    ''
  );
};

const persistAdminChatId = (chatId: string): boolean => {
  const envFile = resolveEnvFilePath();
  const content = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  const lines = content.length > 0 ? content.split(/\r?\n/) : [];
  const index = lines.findIndex((line) => line.trim().startsWith('ADMIN_CHAT_ID='));

  if (index >= 0) {
    const currentValue = lines[index].split('=')[1]?.split('#')[0]?.trim() ?? '';
    if (currentValue) {
      return false;
    }
    lines[index] = `ADMIN_CHAT_ID=${chatId}`;
  } else {
    lines.push(`ADMIN_CHAT_ID=${chatId}`);
  }

  const nextContent = `${lines.filter((line, idx, arr) => !(idx === arr.length - 1 && line === '')).join('\n')}\n`;
  writeFileSync(envFile, nextContent, 'utf8');

  process.env.ADMIN_CHAT_ID = chatId;
  if (!process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()) {
    process.env.TELEGRAM_ADMIN_CHAT_ID = chatId;
  }

  return true;
};

const sendConfirmationMessage = async (chatId: string): Promise<void> => {
  const token = getTelegramBotToken();
  if (!token) {
    return;
  }

  const endpoint = `${getTelegramApiBase()}/bot${token}/sendMessage`;
  const text = 'ADMIN_CHAT_ID detectado y guardado correctamente.';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram confirmation failed with status ${response.status}`);
  }
};

const extractChatIdFromUpdates = (updates: TelegramUpdate[]): string | null => {
  let maxUpdateId = updatesOffset;

  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);

    const chatId = update.message?.chat?.id ?? update.edited_message?.chat?.id;
    if (chatId !== undefined && chatId !== null) {
      updatesOffset = maxUpdateId + 1;
      return String(chatId);
    }
  }

  updatesOffset = maxUpdateId + 1;
  return null;
};

/** Polls Telegram updates once and persists ADMIN_CHAT_ID from first admin message when missing. */
export const detectAdminChatIdOnce = async (): Promise<{
  detected: boolean;
  saved: boolean;
  chatId?: string;
  reason?: string;
}> => {
  const token = getTelegramBotToken();
  if (!token) {
    return { detected: false, saved: false, reason: 'TELEGRAM_BOT_TOKEN is missing' };
  }

  const existingChatId = getConfiguredAdminChatId();
  if (existingChatId) {
    process.env.ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID?.trim() || existingChatId;
    if (!process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()) {
      process.env.TELEGRAM_ADMIN_CHAT_ID = existingChatId;
    }

    return {
      detected: false,
      saved: false,
      chatId: existingChatId,
      reason: 'ADMIN_CHAT_ID already configured',
    };
  }

  const params = new URLSearchParams({
    timeout: '0',
    limit: '20',
  });

  if (updatesOffset > 0) {
    params.set('offset', String(updatesOffset));
  }

  const updatesUrl = `${getTelegramApiBase()}/bot${token}/getUpdates?${params.toString()}`;
  const response = await fetch(updatesUrl);

  if (!response.ok) {
    throw new Error(`Telegram getUpdates failed with status ${response.status}`);
  }

  const payload = (await response.json()) as TelegramUpdatesResponse;
  const updates = payload.result ?? [];

  const detectedChatId = extractChatIdFromUpdates(updates);
  if (!detectedChatId) {
    return { detected: false, saved: false, reason: 'No incoming Telegram messages detected' };
  }

  const saved = persistAdminChatId(detectedChatId);

  if (!saved) {
    return {
      detected: true,
      saved: false,
      chatId: detectedChatId,
      reason: 'ADMIN_CHAT_ID already present in .env',
    };
  }

  await sendConfirmationMessage(detectedChatId);
  return { detected: true, saved: true, chatId: detectedChatId };
};

/** Starts background polling to auto-detect ADMIN_CHAT_ID on first admin message. */
export const startAdminChatIdAutoDetect = (): void => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (pollTimer) {
    return;
  }

  const run = async (): Promise<void> => {
    try {
      const result = await detectAdminChatIdOnce();
      if (result.saved) {
        console.log(`[telegram-admin] ADMIN_CHAT_ID saved: ${result.chatId}`);
      }
    } catch (error) {
      console.error('[telegram-admin] auto-detect failed:', error);
    }
  };

  void run();

  pollTimer = setInterval(() => {
    void run();
  }, Math.max(POLL_INTERVAL_MS, 1000));
};

/** Test helper to reset module-level state. */
export const resetAdminChatDetectorStateForTests = (): void => {
  updatesOffset = 0;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};
