import { timingSafeEqual } from "node:crypto";
import {
  createTelegramAboutReply,
  createTelegramBotApiTextSender,
  createTelegramStartReply,
  createTelegramStopReply,
  createTelegramUnknownCommandReply,
  readTelegramCommand,
  subscriberFromTelegramMessage,
  type TelegramSubscriberCommandInput,
  type TelegramTextSender,
  type TelegramWebhookMessage,
  type TelegramWebhookUpdate
} from "@eduferma/core/telegram";
import { deactivateTelegramSubscriber, upsertTelegramSubscriber } from "@eduferma/db";

type Env = Record<string, string | undefined>;

export type TelegramSubscriberStore = {
  upsertSubscriber(input: TelegramSubscriberCommandInput & { source: string; metadata?: Record<string, unknown> }): Promise<unknown>;
  deactivateSubscriber(chatId: string): Promise<unknown>;
};

export type TelegramWebhookDeps = {
  env?: Env;
  subscriberStore?: TelegramSubscriberStore;
  sender?: TelegramTextSender;
};

type TelegramWebhookConfig = {
  botToken?: string;
  webhookSecret?: string;
  appUrl?: string;
};

export async function handleTelegramWebhook(request: Request, deps: TelegramWebhookDeps = {}): Promise<Response> {
  try {
    const env = deps.env ?? process.env;
    const config = readTelegramWebhookConfig(env);
    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token") ?? "";

    if (!config.webhookSecret) {
      return setupRequired("TELEGRAM_WEBHOOK_SECRET is required before Telegram webhook traffic is accepted.");
    }

    if (!secureCompare(secretHeader, config.webhookSecret)) {
      return unauthorized();
    }

    if (!config.botToken && !deps.sender) {
      return setupRequired("TELEGRAM_BOT_TOKEN is required before Telegram webhook replies can be sent.");
    }

    const update = await readTelegramUpdate(request);
    if (!update.ok) return badRequest(update.message);

    const message = update.value.message;
    if (!message?.text) {
      return ok({ handled: false, reason: "no_text_message" });
    }

    const command = readTelegramCommand(message.text);
    if (!command) {
      return ok({ handled: false, reason: "no_command" });
    }

    const subscriber = subscriberFromTelegramMessage(message);
    if (!subscriber) {
      return ok({ handled: false, reason: "no_user_subscriber" });
    }

    const sender = deps.sender ?? createTelegramBotApiTextSender(config.botToken!);
    const chatId = subscriber.chatId;

    if (command.name === "start") {
      await (deps.subscriberStore ?? createDbTelegramSubscriberStore()).upsertSubscriber({
        ...subscriber,
        source: "telegram_start",
        metadata: {
          updateId: update.value.update_id,
          commandArgs: command.args || undefined
        }
      });

      await sender.sendText({ chatId, text: createTelegramStartReply(config.appUrl), disableWebPagePreview: true });
      return ok({ handled: true, command: "start" });
    }

    if (command.name === "stop") {
      await (deps.subscriberStore ?? createDbTelegramSubscriberStore()).deactivateSubscriber(chatId);
      await sender.sendText({ chatId, text: createTelegramStopReply(config.appUrl), disableWebPagePreview: true });
      return ok({ handled: true, command: "stop" });
    }

    if (command.name === "about" || command.name === "info") {
      await sender.sendText({ chatId, text: createTelegramAboutReply(config.appUrl), disableWebPagePreview: true });
      return ok({ handled: true, command: command.name });
    }

    await sender.sendText({ chatId, text: createTelegramUnknownCommandReply(config.appUrl), disableWebPagePreview: true });
    return ok({ handled: true, command: "unknown" });
  } catch (error) {
    if (hasErrorCode(error, "SETUP_REQUIRED") || hasErrorCode(error, "UNSAFE_DATABASE_URL")) {
      return setupRequired(error instanceof Error ? error.message : "Remote database setup is required.");
    }

    return errorResponse(500, "INTERNAL_ERROR", "Telegram webhook handling failed.");
  }
}

export function readTelegramWebhookConfig(env: Env = process.env): TelegramWebhookConfig {
  return {
    botToken: normalizeEnvValue(env.TELEGRAM_BOT_TOKEN),
    webhookSecret: normalizeEnvValue(env.TELEGRAM_WEBHOOK_SECRET),
    appUrl: normalizeEnvValue(env.NEXT_PUBLIC_APP_URL)
  };
}

function createDbTelegramSubscriberStore(): TelegramSubscriberStore {
  return {
    async upsertSubscriber(input) {
      return upsertTelegramSubscriber(input);
    },
    async deactivateSubscriber(chatId) {
      return deactivateTelegramSubscriber(chatId);
    }
  };
}

async function readTelegramUpdate(
  request: Request
): Promise<{ ok: true; value: TelegramWebhookUpdate } | { ok: false; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON body" };
  }

  if (!isTelegramUpdate(body)) {
    return { ok: false, message: "Invalid Telegram update payload" };
  }

  return { ok: true, value: body };
}

function isTelegramUpdate(value: unknown): value is TelegramWebhookUpdate {
  if (!value || typeof value !== "object") return false;
  const update = value as Partial<TelegramWebhookUpdate>;
  if (typeof update.update_id !== "number") return false;
  if (update.message === undefined) return true;
  return isTelegramMessage(update.message);
}

function isTelegramMessage(value: unknown): value is TelegramWebhookMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<TelegramWebhookMessage>;
  if (typeof message.message_id !== "number") return false;
  if (!message.chat || typeof message.chat !== "object") return false;
  const chat = message.chat as Record<string, unknown>;
  if (typeof chat.id !== "number" || typeof chat.type !== "string") return false;
  if (message.from !== undefined) {
    if (!message.from || typeof message.from !== "object") return false;
    const from = message.from as Record<string, unknown>;
    if (typeof from.id !== "number") return false;
  }
  return message.text === undefined || typeof message.text === "string";
}

function secureCompare(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function ok(data: unknown) {
  return Response.json({ ok: true, ...asObject(data) }, { status: 200 });
}

function badRequest(message: string) {
  return errorResponse(400, "VALIDATION_ERROR", message);
}

function unauthorized() {
  return errorResponse(401, "UNAUTHORIZED", "Invalid Telegram webhook secret.");
}

function setupRequired(message: string) {
  return errorResponse(503, "SETUP_REQUIRED", message);
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function hasErrorCode(error: unknown, code: string) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
