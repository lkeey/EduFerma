import { desc, eq, sql } from "drizzle-orm";
import {
  createTransactionalDb,
  getDb,
  socialPosts
} from "@eduferma/db";
import type { ServiceContext } from "@eduferma/core/services";
import type {
  ProcessPublicationsResponse,
  PublicationDetail
} from "@eduferma/validators";
import { ApiError } from "@/server/api/responses";
import {
  createOwnerPublicationTarget,
  createTeacherPublication,
  createTelegramProvider,
  getTeacherPublication,
  processSpecificTargets,
  publishTeacherPublication,
  updateOwnerPublicationTarget
} from "./service";

export const TELEGRAM_PRODUCTION_ACCEPTANCE_CONFIRMATION =
  "SEND ONE PRIVATE OWNER TELEGRAM";
export const TELEGRAM_PRODUCTION_ACCEPTANCE_RECOVERY_CONFIRMATION =
  "RETRY CONFIRMED FAILED PRIVATE TELEGRAM";

const acceptanceKey = "telegram-owner-private-production-v1";
const acceptanceTargetSlug =
  "production-owner-private-acceptance";

export type TelegramProductionAcceptanceState = {
  targetExists: boolean;
  postId: string | null;
  postExists: boolean;
  postStatus: string | null;
  deliveryCount: number;
  sentDeliveryCount: number;
  providerMessageId: string | null;
  deliveryStatuses: string[];
  deliveryProviderMessageIds: string[];
  deliveryErrorCodes: string[];
  deliveryErrorMessages: string[];
};

export type TelegramPrivateChatAccess = {
  ok: boolean;
  statusCode: number | null;
  errorCode: string | null;
  message: string;
};

export type TelegramBotIdentity = {
  ok: boolean;
  statusCode: number | null;
  username: string | null;
  displayName: string | null;
  errorCode: string | null;
};

export async function runTelegramProductionAcceptance(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProcessPublicationsResponse> {
  const config = readAcceptanceConfig(env);
  await requireTelegramAcceptanceReadiness(env, config);

  const lockClient = createTransactionalDb(env);
  try {
    let response: ProcessPublicationsResponse | undefined;
    await lockClient.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${acceptanceKey}))`
      );
      const existing = await readAcceptanceState();

      if (existing.postExists) {
        assertCompletedAcceptance(existing);
        await processSpecificTargets(
          requirePostId(existing),
          {
            env,
            workerId:
              "telegram-production-acceptance-idempotency"
          }
        );
        const afterIdempotencyCheck =
          await readAcceptanceState();
        assertCompletedAcceptance(afterIdempotencyCheck);
        response = acceptanceResponse(
          "already-sent",
          afterIdempotencyCheck
        );
        return;
      }

      const owner = await findActiveOwner(env);
      const ctx: ServiceContext = {
        user: {
          id: owner.id,
          dbUserId: owner.id,
          email: owner.email,
          name: owner.displayName ?? undefined,
          role: "owner"
        }
      };
      const target = await ensureAcceptanceTarget(
        ctx,
        config.ownerChatId
      );
      const created = await createTeacherPublication(ctx, {
        title: "EduFerma production Telegram acceptance",
        excerpt: "Private owner-chat delivery verification.",
        bodyMd:
          "EduFerma production Telegram delivery is ready. This is the single allowlisted private acceptance message.",
        audience: "EduFerma owner",
        publishAllowed: true,
        targetIds: [target.id],
        metadata: {
          acceptanceKey,
          privateOwnerDelivery: true
        }
      });

      await publishTeacherPublication(
        ctx,
        created.publication.id,
        [target.id]
      );
      const completed = await readAcceptanceState();
      assertCompletedAcceptance(completed);

      await processSpecificTargets(created.publication.id, {
        env,
        workerId:
          "telegram-production-acceptance-idempotency"
      });
      const afterIdempotencyCheck =
        await readAcceptanceState();
      assertCompletedAcceptance(afterIdempotencyCheck);
      response = acceptanceResponse(
        "sent-and-verified",
        afterIdempotencyCheck
      );
    });

    if (!response) {
      throw new ApiError(
        500,
        "INTERNAL_ERROR",
        "Telegram production acceptance did not produce a result"
      );
    }
    return response;
  } finally {
    await lockClient.close();
  }
}

export async function recoverFailedTelegramProductionAcceptance(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProcessPublicationsResponse> {
  const config = readAcceptanceConfig(env);
  await requireTelegramAcceptanceReadiness(env, config);

  const lockClient = createTransactionalDb(env);
  try {
    let response: ProcessPublicationsResponse | undefined;
    await lockClient.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${acceptanceKey}))`
      );
      const failed = await readAcceptanceState();
      assertRecoverableAcceptance(failed);
      const postId = requirePostId(failed);

      await processSpecificTargets(postId, {
        env,
        workerId:
          "telegram-production-acceptance-recovery"
      });
      const completed = await readAcceptanceState();
      assertCompletedAcceptance(completed);

      await processSpecificTargets(postId, {
        env,
        workerId:
          "telegram-production-acceptance-recovery-idempotency"
      });
      const afterIdempotencyCheck =
        await readAcceptanceState();
      assertCompletedAcceptance(afterIdempotencyCheck);
      response = acceptanceResponse(
        "recovered-and-verified",
        afterIdempotencyCheck
      );
    });

    if (!response) {
      throw new ApiError(
        500,
        "INTERNAL_ERROR",
        "Telegram production acceptance recovery did not produce a result"
      );
    }
    return response;
  } finally {
    await lockClient.close();
  }
}

export async function getTelegramProductionAcceptanceStatus(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProcessPublicationsResponse> {
  const config = readAcceptanceConfig(env);
  const [health, botIdentity, privateChatAccess, state] =
    await Promise.all([
      createTelegramProvider(env).getHealth(),
      getTelegramBotIdentity(config.botToken),
      checkTelegramPrivateChatAccess(
        config.botToken,
        config.ownerChatId
      ),
      readAcceptanceState()
    ]);

  return {
    ok: true,
    claimedCount: 0,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
    processedAt: new Date().toISOString(),
    acceptanceState: {
      ...state,
      telegramHealthStatus: health.status,
      botIdentity,
      privateChatAccess
    }
  };
}

export async function getTelegramBotIdentity(
  botToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<TelegramBotIdentity> {
  try {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${botToken}/getMe`,
      { signal: AbortSignal.timeout(8_000) }
    );
    const payload = await safeTelegramJson(response);
    const result = readTelegramResult(payload);
    const telegramOk = Boolean(
      payload &&
      typeof payload === "object" &&
      "ok" in payload &&
      payload.ok === true
    );
    if (response.ok && telegramOk && result) {
      return {
        ok: true,
        statusCode: response.status,
        username: readOptionalString(result, "username"),
        displayName: readOptionalString(result, "first_name"),
        errorCode: null
      };
    }
    return {
      ok: false,
      statusCode: response.status,
      username: null,
      displayName: null,
      errorCode: `HTTP_${response.status}`
    };
  } catch {
    return {
      ok: false,
      statusCode: null,
      username: null,
      displayName: null,
      errorCode: "NETWORK_ERROR"
    };
  }
}

export async function checkTelegramPrivateChatAccess(
  botToken: string,
  ownerChatId: string,
  fetchImpl: typeof fetch = fetch
): Promise<TelegramPrivateChatAccess> {
  try {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(ownerChatId)}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    const payload = await safeTelegramJson(response);
    const telegramOk = Boolean(
      payload &&
      typeof payload === "object" &&
      "ok" in payload &&
      payload.ok === true
    );
    const chatType = readTelegramChatType(payload);
    if (response.ok && telegramOk && chatType === "private") {
      return {
        ok: true,
        statusCode: response.status,
        errorCode: null,
        message: "Telegram private owner chat is reachable"
      };
    }
    if (response.ok && telegramOk) {
      return {
        ok: false,
        statusCode: response.status,
        errorCode: "NOT_PRIVATE",
        message: "Configured Telegram owner target is not a private chat"
      };
    }
    return {
      ok: false,
      statusCode: response.status,
      errorCode: `HTTP_${response.status}`,
      message:
        response.status === 403
          ? "Telegram bot is not allowed to access the configured private chat"
          : "Telegram getChat rejected the configured private chat"
    };
  } catch {
    return {
      ok: false,
      statusCode: null,
      errorCode: "NETWORK_ERROR",
      message: "Telegram getChat request failed"
    };
  }
}

export function readAcceptanceConfig(
  env: NodeJS.ProcessEnv
) {
  const databaseEnv = env.EDUFERMA_DB_ENV?.trim();
  const vercelEnv = env.VERCEL_ENV?.trim();
  if (vercelEnv && vercelEnv !== "production") {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "Telegram production acceptance cannot run in a non-production Vercel environment."
    );
  }
  if (
    databaseEnv !== "production" &&
    vercelEnv !== "production"
  ) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "A production runtime marker is required for Telegram acceptance."
    );
  }
  if (env.ENABLE_DEMO_AUTH?.trim() === "true") {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "Telegram production acceptance cannot run with demo auth enabled."
    );
  }
  const botToken = requireEnvValue(
    env,
    "TELEGRAM_BOT_TOKEN"
  );
  const ownerChatId = requireEnvValue(
    env,
    "TELEGRAM_OWNER_CHAT_ID"
  );
  const allowedChatIds = new Set(
    requireEnvValue(env, "TELEGRAM_ALLOWED_CHAT_IDS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  if (!allowedChatIds.has(ownerChatId)) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "TELEGRAM_OWNER_CHAT_ID must be present in TELEGRAM_ALLOWED_CHAT_IDS."
    );
  }
  if (!/^[1-9]\d*$/.test(ownerChatId)) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "TELEGRAM_OWNER_CHAT_ID must be a positive private-user chat ID; groups and channels are not allowed for acceptance."
    );
  }
  return { botToken, ownerChatId };
}

export function assertCompletedAcceptance(
  state: TelegramProductionAcceptanceState
) {
  if (
    !state.targetExists ||
    !state.postExists ||
    state.postStatus !== "published" ||
    state.deliveryCount !== 1 ||
    state.sentDeliveryCount !== 1 ||
    !state.providerMessageId
  ) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Telegram acceptance requires one published post with exactly one persisted sent delivery and provider message ID.",
      acceptanceStateDetails(state)
    );
  }
}

export function assertRecoverableAcceptance(
  state: TelegramProductionAcceptanceState
) {
  if (
    !state.targetExists ||
    !state.postExists ||
    state.postStatus !== "failed" ||
    state.deliveryCount !== 1 ||
    state.sentDeliveryCount !== 0 ||
    state.deliveryStatuses.length !== 1 ||
    state.deliveryStatuses[0] !== "failed" ||
    state.deliveryProviderMessageIds.length !== 0 ||
    state.deliveryErrorCodes.length !== 1 ||
    state.deliveryErrorCodes[0] !== "400"
  ) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Telegram acceptance recovery is allowed only for one persisted HTTP 400 rejection with no provider message ID.",
      acceptanceStateDetails(state)
    );
  }
}

export function summarizeAcceptanceDetail(
  targetExists: boolean,
  publication: PublicationDetail
): TelegramProductionAcceptanceState {
  const sent = publication.deliveries.filter(
    (delivery) => delivery.status === "sent"
  );
  return {
    targetExists,
    postId: publication.id,
    postExists: true,
    postStatus: publication.status,
    deliveryCount: publication.deliveries.length,
    sentDeliveryCount: sent.length,
    providerMessageId:
      sent[0]?.providerMessageId ?? null,
    deliveryStatuses: publication.deliveries.map(
      (delivery) => delivery.status
    ),
    deliveryProviderMessageIds: publication.deliveries
      .map((delivery) => delivery.providerMessageId)
      .filter((value): value is string => Boolean(value)),
    deliveryErrorCodes: publication.deliveries
      .map((delivery) => delivery.errorCode)
      .filter((value): value is string => Boolean(value)),
    deliveryErrorMessages: publication.deliveries
      .map((delivery) => delivery.errorMessage)
      .filter((value): value is string => Boolean(value))
  };
}

async function ensureAcceptanceTarget(
  ctx: ServiceContext,
  ownerChatId: string
) {
  const db = getDb();
  const existing =
    await db.query.publicationTargets.findFirst({
      where: (row) =>
        eq(row.slug, acceptanceTargetSlug)
    });
  const config = {
    recipientMode: "static" as const,
    chatId: ownerChatId,
    acceptanceKey
  };

  if (existing) {
    if (existing.targetType !== "telegram") {
      throw new ApiError(
        409,
        "CONFLICT",
        "The reserved acceptance target slug belongs to a non-Telegram provider"
      );
    }
    const result = await updateOwnerPublicationTarget(
      ctx,
      existing.id,
      {
        title: "Production owner private Telegram",
        status: "active",
        config
      }
    );
    return result.target;
  }

  const result = await createOwnerPublicationTarget(ctx, {
    slug: acceptanceTargetSlug,
    title: "Production owner private Telegram",
    provider: "telegram",
    status: "active",
    config
  });
  return result.target;
}

async function findActiveOwner(env: NodeJS.ProcessEnv) {
  const db = getDb();
  const configuredEmail = env.OWNER_EMAIL?.trim();
  const owner = await db.query.users.findFirst({
    where: (row) =>
      configuredEmail
        ? eq(row.email, configuredEmail)
        : eq(row.role, "owner")
  });
  if (
    !owner ||
    owner.role !== "owner" ||
    !owner.isActive
  ) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "An active database-backed owner is required"
    );
  }
  return owner;
}

async function findAcceptancePost() {
  const db = getDb();
  return db.query.socialPosts.findFirst({
    where: sql`${socialPosts.metadata}->>'acceptanceKey' = ${acceptanceKey}`,
    orderBy: [desc(socialPosts.createdAt)]
  });
}

async function readAcceptanceState(): Promise<TelegramProductionAcceptanceState> {
  const db = getDb();
  const target =
    await db.query.publicationTargets.findFirst({
      where: (row) =>
        eq(row.slug, acceptanceTargetSlug)
    });
  const post = await findAcceptancePost();
  if (!post) {
    return {
      targetExists: Boolean(target),
      postId: null,
      postExists: false,
      postStatus: null,
      deliveryCount: 0,
      sentDeliveryCount: 0,
      providerMessageId: null,
      deliveryStatuses: [],
      deliveryProviderMessageIds: [],
      deliveryErrorCodes: [],
      deliveryErrorMessages: []
    };
  }

  const detail = await getTeacherPublication(post.id);
  return summarizeAcceptanceDetail(
    Boolean(target),
    detail.publication
  );
}

function acceptanceStateDetails(
  state: TelegramProductionAcceptanceState
) {
  return {
    targetExists: state.targetExists,
    postExists: state.postExists,
    postStatus: state.postStatus,
    deliveryCount: state.deliveryCount,
    sentDeliveryCount: state.sentDeliveryCount,
    providerMessageIdPresent: Boolean(
      state.providerMessageId
    ),
    deliveryStatuses: state.deliveryStatuses,
    deliveryProviderMessageIds:
      state.deliveryProviderMessageIds,
    deliveryErrorCodes: state.deliveryErrorCodes,
    deliveryErrorMessages: state.deliveryErrorMessages
  };
}

async function safeTelegramJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readTelegramChatType(payload: unknown) {
  const result = readTelegramResult(payload);
  return result
    ? readOptionalString(result, "type")
    : null;
}

function readTelegramResult(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("result" in payload) ||
    !payload.result ||
    typeof payload.result !== "object"
  ) {
    return null;
  }
  return payload.result;
}

function readOptionalString(
  value: object,
  key: string
) {
  if (
    !(key in value) ||
    typeof value[key as keyof typeof value] !== "string"
  ) {
    return null;
  }
  return value[key as keyof typeof value] as string;
}

function acceptanceResponse(
  mode:
    | "sent-and-verified"
    | "recovered-and-verified"
    | "already-sent",
  state: TelegramProductionAcceptanceState
): ProcessPublicationsResponse {
  return {
    ok: true,
    claimedCount: mode === "already-sent" ? 0 : 1,
    sentCount: mode === "already-sent" ? 0 : 1,
    failedCount: 0,
    skippedCount: mode === "already-sent" ? 1 : 0,
    processedAt: new Date().toISOString(),
    acceptance: {
      mode,
      postId: requirePostId(state),
      sentDeliveryCount: 1,
      providerMessageId: state.providerMessageId as string
    }
  };
}

async function requireTelegramAcceptanceReadiness(
  env: NodeJS.ProcessEnv,
  config: ReturnType<typeof readAcceptanceConfig>
) {
  const health = await createTelegramProvider(env).getHealth();
  if (health.status !== "ok") {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "Telegram Bot API health check did not pass"
    );
  }
  const privateChatAccess =
    await checkTelegramPrivateChatAccess(
      config.botToken,
      config.ownerChatId
    );
  if (!privateChatAccess.ok) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "Telegram bot cannot access the configured private owner chat",
      { privateChatAccess }
    );
  }
}

function requirePostId(
  state: TelegramProductionAcceptanceState
) {
  if (!state.postId) {
    throw new Error(
      "Telegram acceptance publication was not found."
    );
  }
  return state.postId;
}

function requireEnvValue(
  env: NodeJS.ProcessEnv,
  name: string
) {
  const value = env[name]?.trim();
  if (!value) {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      `${name} is required.`
    );
  }
  return value;
}
