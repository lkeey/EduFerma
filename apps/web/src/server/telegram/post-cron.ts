import { timingSafeEqual } from "node:crypto";
import {
  createSocialPostPromptInput,
  generateSocialPostDraft,
  type SocialContentPlanItem
} from "@eduferma/core";
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
import { z } from "zod";

type Env = Record<string, string | undefined>;

type TelegramPostCronConfig = {
  cronSecrets: string[];
  botToken?: string;
  broadcastEnabled: boolean;
  autosendEnabled: boolean;
  appUrl?: string;
};

export type TelegramPostBroadcastDeps = {
  env?: Env;
  now?: string;
  listSubscribers?: () => Promise<TelegramSubscriberRecord[]>;
  enqueueOutbox?: (
    input: Pick<TelegramBroadcastOutboxRecord, "subscriberId" | "broadcastKey" | "chatId" | "messageText"> & {
      metadata?: Record<string, unknown>;
    }
  ) => Promise<Pick<TelegramBroadcastOutboxRecord, "id"> | undefined>;
  markSent?: (id: string, providerMessageId: string | undefined) => Promise<void>;
  markFailed?: (id: string, errorCode: string, errorMessage: string) => Promise<void>;
  sender?: TelegramTextSender;
  contentPlanItem?: SocialContentPlanItem;
};

export type TelegramPostCronResult = {
  ok: true;
  job: "telegram:posts:cron" | "telegram:posts:manual";
  mode: "disabled" | "approval_required" | "blocked" | "sent";
  generatedAt: string;
  broadcastEnabled: boolean;
  autosendEnabled: boolean;
  sendAttempted: boolean;
  subscriberCount: number;
  sentCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
  draftId?: string;
  reason?: string;
  safetyIssueCount?: number;
  schedule?: string;
};

const ManualTelegramPostRequestSchema = z.object({
  approvedText: z.string().trim().min(1).max(4000)
});

export async function handleTelegramPostCron(
  request: Request,
  deps: TelegramPostBroadcastDeps = {}
): Promise<Response> {
  try {
    const env = deps.env ?? process.env;
    const config = readTelegramPostCronConfig(env);

    if (config.cronSecrets.length === 0) {
      return errorResponse(503, "SETUP_REQUIRED", "Telegram post cron secret is required.");
    }

    if (!isAuthorized(request, config.cronSecrets)) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid Telegram post cron secret.");
    }

    if (request.method === "GET") {
      const result = await runTelegramPostCron(
        {
          ...deps,
          env,
          schedule: request.headers.get("x-vercel-cron-schedule") ?? undefined
        },
        config
      );
      return Response.json(result, { status: 200 });
    }

    if (request.method === "POST") {
      const body = await readManualTelegramPostRequest(request);
      if (!body.ok) {
        return errorResponse(400, "VALIDATION_ERROR", body.message);
      }

      const result = await broadcastTelegramPostText(
        {
          ...deps,
          env,
          job: "telegram:posts:manual",
          approvedText: body.value.approvedText,
          metadata: { source: "telegram:posts:manual" }
        },
        config
      );
      return Response.json(result, { status: 200 });
    }

    return errorResponse(405, "METHOD_NOT_ALLOWED", "Unsupported Telegram post cron method.");
  } catch (error) {
    if (hasErrorCode(error, "SETUP_REQUIRED") || hasErrorCode(error, "UNSAFE_DATABASE_URL")) {
      return errorResponse(503, "SETUP_REQUIRED", error instanceof Error ? error.message : "Remote database setup is required.");
    }

    return errorResponse(500, "INTERNAL_ERROR", "Telegram post cron failed.");
  }
}

export async function runTelegramPostCron(
  options: TelegramPostBroadcastDeps & { schedule?: string },
  config = readTelegramPostCronConfig(options.env ?? process.env)
): Promise<TelegramPostCronResult> {
  const generatedAt = options.now ?? new Date().toISOString();
  const planItem = options.contentPlanItem ?? buildDailyTelegramPostPlan(generatedAt, config.appUrl);
  const draft = generateSocialPostDraft(createSocialPostPromptInput(planItem));

  if (draft.status === "blocked_privacy_review") {
    return baseResult({
      job: "telegram:posts:cron",
      mode: "blocked",
      generatedAt,
      config,
      draftId: draft.draftId,
      reason: "Generated social post draft failed privacy review.",
      safetyIssueCount: draft.privacy.issues.length,
      schedule: options.schedule
    });
  }

  if (!config.autosendEnabled) {
    return baseResult({
      job: "telegram:posts:cron",
      mode: "approval_required",
      generatedAt,
      config,
      draftId: draft.draftId,
      reason: "Telegram post autosend is disabled; draft generation only.",
      schedule: options.schedule
    });
  }

  const hashtags = draft.hashtags.filter(Boolean).join(" ");
  return broadcastTelegramPostText(
    {
      ...options,
      job: "telegram:posts:cron",
      approvedText: [draft.body, hashtags].filter(Boolean).join("\n\n"),
      metadata: { source: "telegram:posts:cron", draftId: draft.draftId },
      schedule: options.schedule
    },
    config
  );
}

function readTelegramPostCronConfig(env: Env): TelegramPostCronConfig {
  return {
    cronSecrets: unique([
      normalizeEnvValue(env.TELEGRAM_POSTS_CRON_SECRET),
      normalizeEnvValue(env.CRON_SECRET)
    ]),
    botToken: normalizeEnvValue(env.TELEGRAM_BOT_TOKEN),
    broadcastEnabled: normalizeEnvValue(env.TELEGRAM_BROADCAST_ENABLED) === "true",
    autosendEnabled: normalizeEnvValue(env.TELEGRAM_POSTS_AUTOSEND_ENABLED) === "true",
    appUrl: normalizeEnvValue(env.NEXT_PUBLIC_APP_URL)
  };
}

async function broadcastTelegramPostText(
  options: TelegramPostBroadcastDeps & {
    job: "telegram:posts:cron" | "telegram:posts:manual";
    approvedText: string;
    metadata: Record<string, unknown>;
    schedule?: string;
  },
  config: TelegramPostCronConfig
): Promise<TelegramPostCronResult> {
  const generatedAt = options.now ?? new Date().toISOString();

  if (!config.broadcastEnabled) {
    return baseResult({
      job: options.job,
      mode: "disabled",
      generatedAt,
      config,
      reason: "Telegram broadcast is disabled by default.",
      schedule: options.schedule
    });
  }

  let messageText: string;
  try {
    messageText = createTelegramBroadcastMessageFromApprovedText(options.approvedText);
  } catch (error) {
    if (error instanceof TelegramBroadcastSafetyError) {
      return baseResult({
        job: options.job,
        mode: "blocked",
        generatedAt,
        config,
        reason: "Telegram post text failed the public-safety guard.",
        safetyIssueCount: error.issues.length,
        schedule: options.schedule
      });
    }
    throw error;
  }

  if (!config.botToken && !options.sender) {
    return baseResult({
      job: options.job,
      mode: "blocked",
      generatedAt,
      config,
      reason: "TELEGRAM_BOT_TOKEN is required before live Telegram post sending.",
      schedule: options.schedule
    });
  }

  const listSubscribers = options.listSubscribers ?? listActiveTelegramSubscribers;
  const enqueueOutbox = options.enqueueOutbox ?? enqueueTelegramBroadcastOutbox;
  const markSent = options.markSent ?? markTelegramBroadcastOutboxSent;
  const markFailed = options.markFailed ?? markTelegramBroadcastOutboxFailed;
  const sender = options.sender ?? createTelegramBotApiTextSender(config.botToken!);
  const subscribers = await listSubscribers();
  const broadcastKey = buildTelegramBroadcastKey(messageText, generatedAt);

  let sentCount = 0;
  let failedCount = 0;
  let skippedDuplicateCount = 0;

  for (const subscriber of subscribers) {
    const outbox = await enqueueOutbox({
      subscriberId: subscriber.id,
      broadcastKey,
      chatId: subscriber.chatId,
      messageText,
      metadata: options.metadata
    });

    if (!outbox) {
      skippedDuplicateCount += 1;
      continue;
    }

    const sendResult = await sender.sendText({
      chatId: subscriber.chatId,
      text: messageText,
      disableWebPagePreview: true
    });

    if (sendResult.status === "sent") {
      sentCount += 1;
      await markSent(outbox.id, sendResult.providerMessageId);
    } else {
      failedCount += 1;
      await markFailed(
        outbox.id,
        sendResult.errorCode ?? "TELEGRAM_SEND_FAILED",
        sendResult.errorMessage ?? "Telegram send failed."
      );
    }
  }

  return {
    ok: true,
    job: options.job,
    mode: "sent",
    generatedAt,
    broadcastEnabled: config.broadcastEnabled,
    autosendEnabled: config.autosendEnabled,
    sendAttempted: subscribers.length > 0,
    subscriberCount: subscribers.length,
    sentCount,
    failedCount,
    skippedDuplicateCount,
    schedule: options.schedule
  };
}

function buildDailyTelegramPostPlan(generatedAt: string, appUrl: string | undefined): SocialContentPlanItem {
  const date = generatedAt.slice(0, 10);
  const siteText = appUrl ? `Полная тренировка и база задач: ${appUrl}.` : "Полная тренировка и база задач доступны в EduFerma.";

  return {
    id: `telegram_daily_task_tip_${date}`,
    topic: "task_tip",
    audience: "students",
    scheduledFor: generatedAt,
    sourceSummary: "Короткий прием: перед решением задачи по информатике выпиши входные данные, единицы измерения и то, что нужно найти.",
    learningOutcome: `${siteText} Такой чек-лист снижает риск потерять баллы на простом чтении условия.`,
    exampleTask: {
      title: "Чек-лист условия",
      statement: "Перед вычислениями отметь алфавит, длину сообщения, ограничение и формат ответа."
    }
  };
}

async function readManualTelegramPostRequest(
  request: Request
): Promise<{ ok: true; value: z.infer<typeof ManualTelegramPostRequestSchema> } | { ok: false; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON body" };
  }

  const parsed = ManualTelegramPostRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, message: "approvedText is required." };
  }

  return { ok: true, value: parsed.data };
}

function baseResult(input: {
  job: "telegram:posts:cron" | "telegram:posts:manual";
  mode: "disabled" | "approval_required" | "blocked";
  generatedAt: string;
  config: TelegramPostCronConfig;
  draftId?: string;
  reason?: string;
  safetyIssueCount?: number;
  schedule?: string;
}): TelegramPostCronResult {
  return {
    ok: true,
    job: input.job,
    mode: input.mode,
    generatedAt: input.generatedAt,
    broadcastEnabled: input.config.broadcastEnabled,
    autosendEnabled: input.config.autosendEnabled,
    sendAttempted: false,
    subscriberCount: 0,
    sentCount: 0,
    failedCount: 0,
    skippedDuplicateCount: 0,
    draftId: input.draftId,
    reason: input.reason,
    safetyIssueCount: input.safetyIssueCount,
    schedule: input.schedule
  };
}

function isAuthorized(request: Request, secrets: string[]): boolean {
  const token = readBearerToken(request.headers.get("authorization"));
  if (!token) return false;
  return secrets.some((secret) => secureCompare(token, secret));
}

function readBearerToken(value: string | null): string | undefined {
  const normalized = value?.trim();
  if (!normalized?.toLowerCase().startsWith("bearer ")) return undefined;
  return normalized.slice("bearer ".length).trim() || undefined;
}

function secureCompare(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function hasErrorCode(error: unknown, code: string) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
