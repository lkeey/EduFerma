import { pathToFileURL } from "node:url";
import { desc, eq, sql } from "drizzle-orm";
import {
  getDb,
  loadWorkspaceEnv,
  socialPosts
} from "@eduferma/db";
import type { ServiceContext } from "@eduferma/core/services";
import type { PublicationDetail } from "@eduferma/validators";
import {
  createOwnerPublicationTarget,
  createTelegramProvider,
  createTeacherPublication,
  getTeacherPublication,
  processSpecificTargets,
  publishTeacherPublication,
  updateOwnerPublicationTarget
} from "../apps/web/src/server/publications/service";
import { createTransactionalDb } from "./lib/transactional-db";

const acceptanceKey = "telegram-owner-private-production-v1";
const acceptanceTargetSlug = "production-owner-private-acceptance";
const applyConfirmation = "SEND ONE PRIVATE OWNER TELEGRAM";

type AcceptanceConfig = {
  botToken: string;
  ownerChatId: string;
};

type AcceptanceState = {
  targetExists: boolean;
  postExists: boolean;
  postStatus: string | null;
  sentDeliveryCount: number;
  providerMessageId: string | null;
};

async function main() {
  loadWorkspaceEnv();
  const apply = process.argv.includes("--apply");
  const confirmation = readFlagValue(process.argv.slice(2), "--confirm");
  if (apply && confirmation !== applyConfirmation) {
    throw new Error(
      `Applying requires --confirm="${applyConfirmation}".`
    );
  }

  const config = readAcceptanceConfig(process.env);
  const health = await createTelegramProvider(process.env).getHealth();
  if (health.status !== "ok") {
    throw new Error("Telegram Bot API health check did not pass.");
  }

  const lockClient = createTransactionalDb();
  try {
    await lockClient.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${acceptanceKey}))`
      );
      const existing = await readAcceptanceState();

      if (existing.postExists) {
        if (
          existing.sentDeliveryCount !== 1 ||
          !existing.providerMessageId
        ) {
          throw new Error(
            "An acceptance publication already exists without exactly one persisted sent delivery. Refusing an automatic retry."
          );
        }

        await processSpecificTargets(
          await requireAcceptancePostId(),
          {
            env: process.env,
            workerId:
              "telegram-production-acceptance-idempotency"
          }
        );
        const afterIdempotencyCheck =
          await readAcceptanceState();
        assertCompletedAcceptance(afterIdempotencyCheck);
        printSafeResult(
          apply ? "already-sent" : "dry-run-complete",
          health.status,
          afterIdempotencyCheck
        );
        return;
      }

      if (!apply) {
        printSafeResult(
          "dry-run-ready",
          health.status,
          existing
        );
        return;
      }

      const owner = await findActiveOwner();
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
        env: process.env,
        workerId:
          "telegram-production-acceptance-idempotency"
      });
      const afterIdempotencyCheck =
        await readAcceptanceState();
      assertCompletedAcceptance(afterIdempotencyCheck);
      printSafeResult(
        "sent-and-verified",
        health.status,
        afterIdempotencyCheck
      );
    });
  } finally {
    await lockClient.close();
  }
}

export function readAcceptanceConfig(
  env: NodeJS.ProcessEnv
): AcceptanceConfig {
  const databaseEnv = env.EDUFERMA_DB_ENV?.trim();
  const vercelEnv = env.VERCEL_ENV?.trim();
  if (vercelEnv && vercelEnv !== "production") {
    throw new Error(
      "Telegram production acceptance cannot run in a non-production Vercel environment."
    );
  }
  if (
    databaseEnv !== "production" &&
    vercelEnv !== "production"
  ) {
    throw new Error(
      "A production runtime marker is required for Telegram acceptance."
    );
  }
  if (env.ENABLE_DEMO_AUTH?.trim() === "true") {
    throw new Error(
      "Telegram production acceptance cannot run with demo auth enabled."
    );
  }
  const botToken = requireEnvValue(env, "TELEGRAM_BOT_TOKEN");
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
    throw new Error(
      "TELEGRAM_OWNER_CHAT_ID must be present in TELEGRAM_ALLOWED_CHAT_IDS."
    );
  }
  if (!/^[1-9]\d*$/.test(ownerChatId)) {
    throw new Error(
      "TELEGRAM_OWNER_CHAT_ID must be a positive private-user chat ID; groups and channels are not allowed for acceptance."
    );
  }
  return { botToken, ownerChatId };
}

export function assertCompletedAcceptance(
  state: AcceptanceState
) {
  if (
    !state.postExists ||
    state.postStatus !== "published" ||
    state.sentDeliveryCount !== 1 ||
    !state.providerMessageId
  ) {
    throw new Error(
      "Telegram acceptance requires one published post with exactly one persisted sent delivery and provider message ID."
    );
  }
}

async function ensureAcceptanceTarget(
  ctx: ServiceContext,
  ownerChatId: string
) {
  const db = getDb();
  const existing =
    await db.query.publicationTargets.findFirst({
      where: (row) => eq(row.slug, acceptanceTargetSlug)
    });
  const config = {
    recipientMode: "static" as const,
    chatId: ownerChatId,
    acceptanceKey
  };

  if (existing) {
    if (existing.targetType !== "telegram") {
      throw new Error(
        "The reserved acceptance target slug belongs to a non-Telegram provider."
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

async function findActiveOwner() {
  const db = getDb();
  const configuredEmail = process.env.OWNER_EMAIL?.trim();
  const owner = await db.query.users.findFirst({
    where: (row) =>
      configuredEmail
        ? eq(row.email, configuredEmail)
        : eq(row.role, "owner")
  });
  if (!owner || owner.role !== "owner" || !owner.isActive) {
    throw new Error(
      "An active database-backed owner is required."
    );
  }
  return owner;
}

async function requireAcceptancePostId() {
  const post = await findAcceptancePost();
  if (!post) {
    throw new Error("Telegram acceptance publication not found.");
  }
  return post.id;
}

async function findAcceptancePost() {
  const db = getDb();
  return db.query.socialPosts.findFirst({
    where: sql`${socialPosts.metadata}->>'acceptanceKey' = ${acceptanceKey}`,
    orderBy: [desc(socialPosts.createdAt)]
  });
}

async function readAcceptanceState(): Promise<AcceptanceState> {
  const db = getDb();
  const target = await db.query.publicationTargets.findFirst({
    where: (row) => eq(row.slug, acceptanceTargetSlug)
  });
  const post = await findAcceptancePost();
  if (!post) {
    return {
      targetExists: Boolean(target),
      postExists: false,
      postStatus: null,
      sentDeliveryCount: 0,
      providerMessageId: null
    };
  }

  const detail = await getTeacherPublication(post.id);
  return summarizeAcceptanceDetail(Boolean(target), detail.publication);
}

export function summarizeAcceptanceDetail(
  targetExists: boolean,
  publication: PublicationDetail
): AcceptanceState {
  const sent = publication.deliveries.filter(
    (delivery) => delivery.status === "sent"
  );
  return {
    targetExists,
    postExists: true,
    postStatus: publication.status,
    sentDeliveryCount: sent.length,
    providerMessageId: sent[0]?.providerMessageId ?? null
  };
}

function printSafeResult(
  mode: string,
  healthStatus: string,
  state: AcceptanceState
) {
  console.log(
    JSON.stringify(
      {
        ok:
          mode === "dry-run-ready" ||
          (state.postStatus === "published" &&
            state.sentDeliveryCount === 1 &&
            Boolean(state.providerMessageId)),
        mode,
        telegramHealth: healthStatus,
        targetExists: state.targetExists,
        postExists: state.postExists,
        postStatus: state.postStatus,
        sentDeliveryCount: state.sentDeliveryCount,
        providerMessageId: state.providerMessageId
      },
      null,
      2
    )
  );
}

function requireEnvValue(
  env: NodeJS.ProcessEnv,
  name: string
) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function readFlagValue(argv: string[], name: string) {
  const direct = argv.find((value) =>
    value.startsWith(`${name}=`)
  );
  if (direct) return direct.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Telegram production acceptance failed."
    );
    process.exitCode = 1;
  });
}
