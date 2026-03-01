import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { users } from "../shared/schema.js";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
      type?: string;
    };
  };
};

type TelegramUpdatesResponse = {
  ok: boolean;
  result?: TelegramUpdate[];
};

let telegramUpdatesOffset: number | null = null;

function getTelegramApiBase(): string {
  return (process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org").replace(/\/+$/, "");
}

function getTelegramBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function getTelegramBotUsername(): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  return username ? username.replace(/^@/, "") : null;
}

function buildTelegramConnectUrl(token: string): string | null {
  const username = getTelegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}

function extractStartToken(text: string): string | null {
  const match = text.trim().match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?$/i);
  return match?.[1] ?? null;
}

async function fetchTelegramUpdates(): Promise<TelegramUpdate[]> {
  const botToken = getTelegramBotToken();
  if (!botToken) return [];

  const params = new URLSearchParams();
  if (telegramUpdatesOffset !== null) {
    params.set("offset", String(telegramUpdatesOffset));
  }
  params.set("limit", "100");
  params.set("allowed_updates", JSON.stringify(["message"]));
  params.set("timeout", "0");

  const url = `${getTelegramApiBase()}/bot${botToken}/getUpdates?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Telegram getUpdates failed (${response.status}): ${errorPayload}`);
  }

  const payload = (await response.json()) as TelegramUpdatesResponse;
  if (!payload.ok) {
    throw new Error("Telegram getUpdates returned ok=false");
  }

  return payload.result ?? [];
}

export async function syncTelegramConnectionsFromUpdates(): Promise<number> {
  const updates = await fetchTelegramUpdates();
  if (updates.length === 0) return 0;

  let linkedUsers = 0;
  let maxUpdateId = telegramUpdatesOffset ?? 0;

  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);

    const text = update.message?.text;
    const chatId = update.message?.chat?.id;
    if (!text || chatId === undefined) continue;

    const token = extractStartToken(text);
    if (!token) continue;

    const updatedUsers = await db
      .update(users)
      .set({
        telegramChatId: String(chatId),
        telegramLinkToken: null,
      })
      .where(eq(users.telegramLinkToken, token))
      .returning({ id: users.id });

    linkedUsers += updatedUsers.length;
  }

  telegramUpdatesOffset = maxUpdateId + 1;
  return linkedUsers;
}

export async function getTelegramConnectUrlForUser(
  userId: number,
  existingToken: string | null | undefined,
): Promise<string | null> {
  if (!getTelegramBotToken()) return null;

  const reusableToken = existingToken?.trim() ?? "";
  if (reusableToken) {
    return buildTelegramConnectUrl(reusableToken);
  }

  const newToken = randomBytes(24).toString("hex");
  await db.update(users).set({ telegramLinkToken: newToken }).where(eq(users.id, userId));
  return buildTelegramConnectUrl(newToken);
}
