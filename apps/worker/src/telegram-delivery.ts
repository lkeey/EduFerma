import type { TelegramMessageSender, TelegramOutboundMessage, TelegramSendResult } from "@eduferma/core/telegram";

export type TelegramDeliveryEnv = Record<string, string | undefined>;

export type TelegramDeliveryRuntimeConfig = {
  botTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  allowedChatIds: string[];
  ownerChatId?: string;
  appUrl?: string;
  sendEnabled: boolean;
};

export function readTelegramDeliveryRuntimeConfig(
  env: TelegramDeliveryEnv = process.env
): TelegramDeliveryRuntimeConfig {
  const ownerChatId = normalizeEnvValue(env.TELEGRAM_OWNER_CHAT_ID);
  const allowedChatIds = uniqueValues([
    ...parseCsvEnv(env.TELEGRAM_ALLOWED_CHAT_IDS),
    ...(ownerChatId ? [ownerChatId] : [])
  ]);

  return {
    botTokenConfigured: Boolean(normalizeEnvValue(env.TELEGRAM_BOT_TOKEN)),
    webhookSecretConfigured: Boolean(normalizeEnvValue(env.TELEGRAM_WEBHOOK_SECRET)),
    allowedChatIds,
    ownerChatId,
    appUrl: normalizeEnvValue(env.NEXT_PUBLIC_APP_URL),
    sendEnabled: normalizeEnvValue(env.TELEGRAM_DELIVERY_SEND_ENABLED) === "true"
  };
}

export function createTelegramDryRunSender(config = readTelegramDeliveryRuntimeConfig()): TelegramMessageSender {
  return {
    async send(message: TelegramOutboundMessage): Promise<TelegramSendResult> {
      return buildTelegramDryRunResult(message, config);
    }
  };
}

export function buildTelegramDryRunResult(
  message: TelegramOutboundMessage,
  config: TelegramDeliveryRuntimeConfig
): TelegramSendResult {
  const allowedByChatPolicy = isTelegramChatAllowed(message.destination.chatId, config.allowedChatIds);

  if (message.destination.consentStatus !== "granted") {
    return {
      status: "blocked",
      sendAttempted: false,
      message,
      reason: "Telegram recipient has not granted delivery consent.",
      tokenConfigured: config.botTokenConfigured,
      explicitSendEnabled: config.sendEnabled,
      allowedByChatPolicy
    };
  }

  if (!allowedByChatPolicy) {
    return {
      status: "blocked",
      sendAttempted: false,
      message,
      reason: "Telegram chat_id is not in TELEGRAM_ALLOWED_CHAT_IDS.",
      tokenConfigured: config.botTokenConfigured,
      explicitSendEnabled: config.sendEnabled,
      allowedByChatPolicy
    };
  }

  return {
    status: "dry_run",
    sendAttempted: false,
    message,
    reason:
      config.botTokenConfigured && config.sendEnabled
        ? "Dry-run Telegram sender selected; no network request was made."
        : "Telegram delivery is not enabled; no network request was made.",
    tokenConfigured: config.botTokenConfigured,
    explicitSendEnabled: config.sendEnabled,
    allowedByChatPolicy
  };
}

export function isTelegramChatAllowed(chatId: string, allowedChatIds: string[]): boolean {
  return allowedChatIds.length === 0 || allowedChatIds.includes(chatId);
}

function parseCsvEnv(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}
