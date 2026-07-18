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
};

export async function runTelegramProductionAcceptance(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProcessPublicationsResponse> {
  const config = readAcceptanceConfig(env);
  const health = await createTelegramProvider(env).getHealth();
  if (health.status !== "ok") {
    throw new ApiError(
      503,
      "SETUP_REQUIRED",
      "Telegram Bot API health check did not pass"
    );
  }

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
    throw new Error(
      "Telegram acceptance requires one published post with exactly one persisted sent delivery and provider message ID."
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
      sent[0]?.providerMessageId ?? null
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
      providerMessageId: null
    };
  }

  const detail = await getTeacherPublication(post.id);
  return summarizeAcceptanceDetail(
    Boolean(target),
    detail.publication
  );
}

function acceptanceResponse(
  mode: "sent-and-verified" | "already-sent",
  state: TelegramProductionAcceptanceState
): ProcessPublicationsResponse {
  return {
    ok: true,
    claimedCount: mode === "sent-and-verified" ? 1 : 0,
    sentCount: mode === "sent-and-verified" ? 1 : 0,
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
