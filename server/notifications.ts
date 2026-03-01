import nodemailer from "nodemailer";

type OrderNotificationInput = {
  orderId: number;
  total: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTelegramChatId?: string;
  items: {
    productId: number;
    name: string;
    quantity: number;
    unitPrice: string;
    description?: string;
  }[];
  address: {
    fullName: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    phone: string;
  };
};

function isEnabled(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() === "true";
}

function formatAmount(rawAmount: string): string {
  const amount = Number(rawAmount);
  if (Number.isNaN(amount)) return rawAmount;
  return amount.toFixed(2);
}

function formatProductLines(items: OrderNotificationInput["items"]): string {
  if (!items.length) return "Sin detalles de productos.";

  return items
    .map((item, index) => {
      const subtotal = formatAmount((Number(item.unitPrice || "0") * item.quantity).toString());
      const description = item.description?.trim() || "Sin descripción";
      return (
        `${index + 1}. ${item.name}\n` +
        `   Cantidad: ${item.quantity}\n` +
        `   Precio unitario: $${formatAmount(item.unitPrice)}\n` +
        `   Subtotal: $${subtotal}\n` +
        `   Descripción: ${description}`
      );
    })
    .join("\n\n");
}

function formatAddress(address: OrderNotificationInput["address"]): string {
  return (
    `Nombre: ${address.fullName}\n` +
    `Teléfono: ${address.phone}\n` +
    `Dirección: ${address.street}\n` +
    `Ciudad: ${address.city}\n` +
    `Código postal: ${address.zip}\n` +
    `País: ${address.country}`
  );
}

function getTelegramConfig() {
  return {
    enabled: isEnabled(process.env.TELEGRAM_NOTIFICATIONS_ENABLED, false),
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ?? "",
    apiBase: process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org",
  };
}

function getEmailConfig() {
  return {
    enabled: isEnabled(process.env.EMAIL_NOTIFICATIONS_ENABLED, false),
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: isEnabled(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS?.trim() ?? "",
    from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "",
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ?? "",
  };
}

async function sendTelegramToChat(chatId: string, text: string): Promise<void> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) return;
  if (!cfg.botToken) {
    console.error("[notifications] Telegram enabled but TELEGRAM_BOT_TOKEN is missing");
    return;
  }

  const response = await fetch(`${cfg.apiBase}/bot${cfg.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${error}`);
  }
}

async function sendTelegramWithRetry(chatId: string, text: string, maxAttempts = 3): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sendTelegramToChat(chatId, text);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw lastError;
}

async function sendEmail(options: { to: string; subject: string; text: string }): Promise<void> {
  const cfg = getEmailConfig();
  if (!cfg.enabled) return;
  if (!cfg.host || !cfg.port || !cfg.user || !cfg.pass || !cfg.from) {
    console.error("[notifications] Email enabled but SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM is incomplete");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}

export async function sendOrderNotifications(input: OrderNotificationInput): Promise<void> {
  const notificationsEnabled = isEnabled(process.env.ORDER_NOTIFICATIONS_ENABLED, true);
  if (!notificationsEnabled) return;

  const orderTotal = formatAmount(input.total);
  const productLines = formatProductLines(input.items);
  const deliveryAddress = formatAddress(input.address);
  const customerMessage =
    `Hola ${input.customerName}, tu pedido #${input.orderId} fue confirmado.\n\n` +
    `Teléfono de contacto: ${input.customerPhone}\n` +
    `Total: $${orderTotal}\n\n` +
    `Detalles del pedido:\n${productLines}\n\n` +
    "Gracias por comprar con nosotros.";
  const adminMessage =
    `Nuevo pedido confirmado #${input.orderId}\n` +
    `Cliente: ${input.customerName}\n` +
    `Email: ${input.customerEmail}\n` +
    `Telefono: ${input.customerPhone}\n` +
    `Total: $${orderTotal}\n\n` +
    `Dirección de entrega:\n${deliveryAddress}\n\n` +
    `Detalles del pedido:\n${productLines}`;
  const customerTelegramMessage = customerMessage;

  const cfg = getEmailConfig();
  const telegramCfg = getTelegramConfig();
  const telegramTargets: Array<{ channel: "admin_telegram" | "customer_telegram"; chatId: string; text: string }> = [];

  if (telegramCfg.adminChatId) {
    telegramTargets.push({
      channel: "admin_telegram",
      chatId: telegramCfg.adminChatId,
      text: adminMessage,
    });
  }

  if (input.customerTelegramChatId) {
    telegramTargets.push({
      channel: "customer_telegram",
      chatId: input.customerTelegramChatId,
      text: customerTelegramMessage,
    });
  }

  for (const target of telegramTargets) {
    try {
      await sendTelegramWithRetry(target.chatId, target.text);
      console.log(`[notifications] ${target.channel} sent for order #${input.orderId}`);
    } catch (error) {
      console.error(`[notifications] ${target.channel} failed for order #${input.orderId}:`, error);
    }
  }

  const tasks: Array<{ channel: "customer_email" | "admin_email"; promise: Promise<void> }> = [];
  if (input.customerEmail) {
    tasks.push({
      channel: "customer_email",
      promise: sendEmail({
        to: input.customerEmail,
        subject: `Confirmacion de pedido #${input.orderId}`,
        text: customerMessage,
      }),
    });
  }

  if (cfg.adminEmail) {
    tasks.push({
      channel: "admin_email",
      promise: sendEmail({
        to: cfg.adminEmail,
        subject: `Nuevo pedido #${input.orderId}`,
        text: adminMessage,
      }),
    });
  }

  const results = await Promise.allSettled(tasks.map((task) => task.promise));
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const target = tasks[index].channel;
      console.error(`[notifications] ${target} failed for order #${input.orderId}:`, result.reason);
    }
  }
}
