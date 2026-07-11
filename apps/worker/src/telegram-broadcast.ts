import {
  TelegramBroadcastSafetyError,
  buildTelegramBroadcastKey,
  createTelegramBotApiTextSender,
  createTelegramBroadcastMessageFromApprovedText,
  type TelegramTextSender
} from "@eduferma/core/telegram";
import {
  enqueueTelegramBroadcastOutbox,
  listActiveTelegramSubscribers,
  markTelegramBroadcastOutboxFailed,
  markTelegramBroadcastOutboxSent,
  type TelegramBroadcastOutboxRecord,
  type TelegramSubscriberRecord
} from "@eduferma/db";

type Env = Record<string, string | undefined>;

export type TelegramBroadcastOptions = {
  env?: Env;
  argv?: string[];
  approvedText?: string;
  now?: string;
};

export type TelegramBroadcastDeps = {
  listSubscribers?: () => Promise<TelegramSubscriberRecord[]>;
  enqueueOutbox?: (
    input: Pick<TelegramBroadcastOutboxRecord, "subscriberId" | "broadcastKey" | "chatId" | "messageText"> & {
      metadata?: Record<string, unknown>;
    }
  ) => Promise<Pick<TelegramBroadcastOutboxRecord, "id"> | undefined>;
  markSent?: (id: string, providerMessageId: string | undefined) => Promise<void>;
  markFailed?: (id: string, errorCode: string, errorMessage: string) => Promise<void>;
  sender?: TelegramTextSender;
};

export type TelegramBroadcastResult = {
  ok: true;
  job: "telegram:broadcast:manual";
  mode: "disabled" | "blocked" | "sent";
  broadcastEnabled: boolean;
  sendAttempted: boolean;
  subscriberCount: number;
  sentCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
  reason?: string;
  safetyIssueCount?: number;
};

export async function runTelegramBroadcastToSubscribers(
  options: TelegramBroadcastOptions = {},
  deps: TelegramBroadcastDeps = {}
): Promise<TelegramBroadcastResult> {
  const env = options.env ?? process.env;
  const broadcastEnabled = normalizeEnvValue(env.TELEGRAM_BROADCAST_ENABLED) === "true";

  if (!broadcastEnabled) {
    return blockedOrDisabled("disabled", "Telegram broadcast is disabled by default.", false);
  }

  const approvedText = options.approvedText ?? readApprovedTextArg(options.argv ?? []);
  if (!approvedText) {
    return blockedOrDisabled("blocked", "Pass --approved-text with public-safe approved copy before broadcasting.", true);
  }

  let messageText: string;
  try {
    messageText = createTelegramBroadcastMessageFromApprovedText(approvedText);
  } catch (error) {
    if (error instanceof TelegramBroadcastSafetyError) {
      return {
        ...blockedOrDisabled("blocked", "Telegram broadcast text failed the public-safety guard.", true),
        safetyIssueCount: error.issues.length
      };
    }
    throw error;
  }

  const botToken = normalizeEnvValue(env.TELEGRAM_BOT_TOKEN);
  if (!botToken && !deps.sender) {
    return blockedOrDisabled("blocked", "TELEGRAM_BOT_TOKEN is required before live broadcast sending.", true);
  }

  const listSubscribers = deps.listSubscribers ?? listActiveTelegramSubscribers;
  const enqueueOutbox = deps.enqueueOutbox ?? enqueueTelegramBroadcastOutbox;
  const markSent = deps.markSent ?? markTelegramBroadcastOutboxSent;
  const markFailed = deps.markFailed ?? markTelegramBroadcastOutboxFailed;
  const sender = deps.sender ?? createTelegramBotApiTextSender(botToken!);
  const subscribers = await listSubscribers();
  const broadcastKey = buildTelegramBroadcastKey(messageText, options.now);

  let sentCount = 0;
  let failedCount = 0;
  let skippedDuplicateCount = 0;

  for (const subscriber of subscribers) {
    const outbox = await enqueueOutbox({
      subscriberId: subscriber.id,
      broadcastKey,
      chatId: subscriber.chatId,
      messageText,
      metadata: { source: "telegram:broadcast:manual" }
    });

    if (!outbox) {
      skippedDuplicateCount += 1;
      continue;
    }

    const result = await sender.sendText({
      chatId: subscriber.chatId,
      text: messageText,
      disableWebPagePreview: true
    });

    if (result.status === "sent") {
      sentCount += 1;
      await markSent(outbox.id, result.providerMessageId);
    } else {
      failedCount += 1;
      await markFailed(outbox.id, result.errorCode ?? "TELEGRAM_SEND_FAILED", result.errorMessage ?? "Telegram send failed.");
    }
  }

  return {
    ok: true,
    job: "telegram:broadcast:manual",
    mode: "sent",
    broadcastEnabled,
    sendAttempted: subscribers.length > 0,
    subscriberCount: subscribers.length,
    sentCount,
    failedCount,
    skippedDuplicateCount
  };
}

function blockedOrDisabled(
  mode: "disabled" | "blocked",
  reason: string,
  broadcastEnabled: boolean
): TelegramBroadcastResult {
  return {
    ok: true,
    job: "telegram:broadcast:manual",
    mode,
    broadcastEnabled,
    sendAttempted: false,
    subscriberCount: 0,
    sentCount: 0,
    failedCount: 0,
    skippedDuplicateCount: 0,
    reason
  };
}

function readApprovedTextArg(argv: string[]) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--approved-text=")) {
      return arg.slice("--approved-text=".length).trim();
    }
    if (arg === "--approved-text") {
      return argv[index + 1]?.trim();
    }
  }
  return undefined;
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
