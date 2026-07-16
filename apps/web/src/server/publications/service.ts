import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lte,
  or
} from "drizzle-orm";
import { getDb, publicationEvents, publicationTargets, socialDeliveries, socialPosts, socialPostTargets, telegramSubscribers } from "@eduferma/db";
import type { ServiceContext } from "@eduferma/core/services";
import { SetupRequiredError } from "@eduferma/core/services";
import {
  type CreatePublicationRequest,
  type CreatePublicationTargetRequest,
  type PublicationDetail,
  type PublicationPostStatus,
  type PublicationProvider,
  type PublicationProviderHealth,
  type PublicationSummary,
  type PublicationTargetStatus,
  type PublicationTargetSummary,
  type ProcessPublicationsResponse,
  type PublicationRetryRequest,
  type UpdatePublicationRequest,
  type UpdatePublicationTargetRequest
} from "@eduferma/validators";
import { ApiError } from "@/server/api/responses";

type Db = ReturnType<typeof getDb>;
type DbPublicationTarget = typeof publicationTargets.$inferSelect;
type DbSocialPost = typeof socialPosts.$inferSelect;
type DbSocialPostTarget = typeof socialPostTargets.$inferSelect;
type DbSocialDelivery = typeof socialDeliveries.$inferSelect;
type DbPublicationEvent = typeof publicationEvents.$inferSelect;

type PublicationTargetConfig = {
  recipientMode?: "static" | "subscriber-opt-in";
  chatId?: string;
  [key: string]: unknown;
};

type OptionalFetch = typeof fetch | undefined;

type ProviderSendInput = {
  post: DbSocialPost;
  target: DbPublicationTarget;
  text: string;
};

type ProviderSendResult = {
  status: "sent" | "failed";
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

type PublicationProviderAdapter = {
  provider: PublicationProvider;
  getHealth(): Promise<PublicationProviderHealth>;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
};

type PublishMutationResult = {
  publication: PublicationDetail;
  action: "created" | "updated" | "published" | "scheduled" | "cancelled" | "retried";
};

type TargetMutationResult = {
  target: PublicationTargetSummary;
  action: "created" | "updated";
};

type ProcessOptions = {
  limit?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: OptionalFetch;
  workerId?: string;
};

export async function listTeacherPublications(): Promise<{ posts: PublicationSummary[] }> {
  const db = getDbSafe();
  const posts = await db.query.socialPosts.findMany({
    orderBy: (row, { desc: orderDesc }) => [orderDesc(row.updatedAt)],
    limit: 50
  });

  return { posts: await Promise.all(posts.map((post) => mapPublicationSummary(db, post))) };
}

export async function createTeacherPublication(
  ctx: ServiceContext,
  input: CreatePublicationRequest
): Promise<PublishMutationResult> {
  const db = getDbSafe();
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  const now = new Date();
  const [post] = await db
    .insert(socialPosts)
    .values({
      createdByUserId: ctx.user.id,
      duplicateOfPostId: null,
      revision: 1,
      title: input.title.trim(),
      excerpt: normalizeNullableText(input.excerpt),
      bodyMd: input.bodyMd.trim(),
      audience: normalizeNullableText(input.audience),
      contentHash: hashContent(input.title, input.bodyMd),
      status: scheduledFor ? "scheduled" : "draft",
      scheduledFor,
      publishAllowed: input.publishAllowed,
      metadata: input.metadata ?? {},
      updatedAt: now
    })
    .returning();

  await replacePostTargets(db, post, input.targetIds, scheduledFor ? "scheduled" : "pending", scheduledFor ?? undefined);
  await insertPublicationEvent(db, {
    socialPostId: post.id,
    actorUserId: ctx.user.id,
    eventType: "created",
    payload: { targetIds: input.targetIds }
  });

  return {
    publication: await mapPublicationDetail(db, post.id),
    action: "created"
  };
}

export async function getTeacherPublication(postId: string): Promise<{ publication: PublicationDetail }> {
  const db = getDbSafe();
  return { publication: await mapPublicationDetail(db, postId) };
}

export async function updateTeacherPublication(
  ctx: ServiceContext,
  postId: string,
  input: UpdatePublicationRequest
): Promise<PublishMutationResult> {
  const db = getDbSafe();
  const post = await requireEditablePost(db, postId);
  const nextScheduledFor = input.scheduledFor === undefined
    ? post.scheduledFor
    : input.scheduledFor === null
      ? null
      : new Date(input.scheduledFor);
  const nextStatus: PublicationPostStatus = post.status === "scheduled" || nextScheduledFor ? "scheduled" : "draft";

  const [updated] = await db
    .update(socialPosts)
    .set({
      title: input.title?.trim() ?? post.title,
      excerpt: input.excerpt === undefined ? post.excerpt : normalizeNullableText(input.excerpt),
      bodyMd: input.bodyMd?.trim() ?? post.bodyMd,
      audience: input.audience === undefined ? post.audience : normalizeNullableText(input.audience),
      contentHash: hashContent(input.title?.trim() ?? post.title, input.bodyMd?.trim() ?? post.bodyMd),
      status: nextStatus,
      scheduledFor: nextScheduledFor,
      publishAllowed: input.publishAllowed ?? post.publishAllowed,
      metadata: input.metadata ?? post.metadata,
      updatedAt: new Date()
    })
    .where(eq(socialPosts.id, post.id))
    .returning();

  if (input.targetIds) {
    await replacePostTargets(db, updated, input.targetIds, nextStatus === "scheduled" ? "scheduled" : "pending", nextScheduledFor ?? undefined);
  } else if (post.status === "scheduled" || nextStatus === "scheduled") {
    await syncExistingTargetSchedule(db, post.id, nextScheduledFor ?? undefined, nextStatus === "scheduled");
  }

  await insertPublicationEvent(db, {
    socialPostId: updated.id,
    actorUserId: ctx.user.id,
    eventType: "updated",
    payload: { updatedFields: Object.keys(input) }
  });

  return {
    publication: await mapPublicationDetail(db, updated.id),
    action: "updated"
  };
}

export async function publishTeacherPublication(
  ctx: ServiceContext,
  postId: string,
  targetIds?: string[]
): Promise<PublishMutationResult> {
  const db = getDbSafe();
  const post = await requirePublishablePost(db, postId);
  if (!post.publishAllowed) {
    throw new ApiError(409, "CONFLICT", "Publication is not approved for delivery");
  }

  const resolvedTargetIds = targetIds && targetIds.length > 0 ? targetIds : await currentTargetIds(db, post.id);
  if (resolvedTargetIds.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "At least one target is required");
  }

  await replacePostTargets(db, post, resolvedTargetIds, "scheduled", new Date());
  const [updated] = await db
    .update(socialPosts)
    .set({ status: "scheduled", scheduledFor: new Date(), updatedAt: new Date() })
    .where(eq(socialPosts.id, post.id))
    .returning();

  await insertPublicationEvent(db, {
    socialPostId: updated.id,
    actorUserId: ctx.user.id,
    eventType: "publish_started",
    payload: { targetIds: resolvedTargetIds }
  });

  await processSpecificTargets(resolvedTargetIds, { env: process.env, fetchImpl: fetch, workerId: `teacher:${ctx.user.id}` });

  return {
    publication: await mapPublicationDetail(db, updated.id),
    action: "published"
  };
}

export async function scheduleTeacherPublication(
  ctx: ServiceContext,
  postId: string,
  scheduledFor: string,
  targetIds?: string[]
): Promise<PublishMutationResult> {
  const db = getDbSafe();
  const post = await requireEditablePost(db, postId);
  const when = new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid scheduledFor timestamp");
  }

  const resolvedTargetIds = targetIds && targetIds.length > 0 ? targetIds : await currentTargetIds(db, post.id);
  if (resolvedTargetIds.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "At least one target is required");
  }

  await replacePostTargets(db, post, resolvedTargetIds, "scheduled", when);
  const [updated] = await db
    .update(socialPosts)
    .set({
      status: "scheduled",
      scheduledFor: when,
      publishAllowed: true,
      updatedAt: new Date()
    })
    .where(eq(socialPosts.id, post.id))
    .returning();

  await insertPublicationEvent(db, {
    socialPostId: updated.id,
    actorUserId: ctx.user.id,
    eventType: "scheduled",
    payload: { scheduledFor }
  });

  return {
    publication: await mapPublicationDetail(db, updated.id),
    action: "scheduled"
  };
}

export async function cancelTeacherPublicationSchedule(
  ctx: ServiceContext,
  postId: string
): Promise<PublishMutationResult> {
  const db = getDbSafe();
  const post = await requireEditablePost(db, postId);
  if (post.status !== "scheduled") {
    throw new ApiError(409, "CONFLICT", "Only scheduled publications can be cancelled");
  }

  const [updated] = await db
    .update(socialPosts)
    .set({ status: "draft", scheduledFor: null, updatedAt: new Date() })
    .where(eq(socialPosts.id, post.id))
    .returning();
  await syncExistingTargetSchedule(db, post.id, undefined, false);

  await insertPublicationEvent(db, {
    socialPostId: updated.id,
    actorUserId: ctx.user.id,
    eventType: "schedule_cancelled",
    payload: {}
  });

  return {
    publication: await mapPublicationDetail(db, updated.id),
    action: "cancelled"
  };
}

export async function retryTeacherPublication(
  ctx: ServiceContext,
  postId: string,
  input: PublicationRetryRequest
): Promise<PublishMutationResult> {
  const db = getDbSafe();
  const original = await requirePost(db, postId);
  if (original.status !== "published" && original.status !== "failed") {
    throw new ApiError(409, "CONFLICT", "Only published or failed publications can be retried");
  }

  const existingTargetIds = await currentTargetIds(db, original.id);
  const resolvedTargetIds = input.targetIds && input.targetIds.length > 0 ? input.targetIds : existingTargetIds;
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  const now = new Date();
  const [copy] = await db
    .insert(socialPosts)
    .values({
      createdByUserId: ctx.user.id,
      duplicateOfPostId: original.id,
      revision: original.revision + 1,
      title: original.title,
      excerpt: original.excerpt,
      bodyMd: original.bodyMd,
      audience: original.audience,
      contentHash: original.contentHash,
      status: scheduledFor ? "scheduled" : "draft",
      scheduledFor,
      publishAllowed: original.publishAllowed,
      metadata: { ...(original.metadata as Record<string, unknown>), retriedFromPostId: original.id },
      updatedAt: now
    })
    .returning();

  await replacePostTargets(db, copy, resolvedTargetIds, scheduledFor ? "scheduled" : "pending", scheduledFor ?? undefined);
  await insertPublicationEvent(db, {
    socialPostId: copy.id,
    actorUserId: ctx.user.id,
    eventType: "retried",
    payload: { sourcePostId: original.id }
  });

  if (!scheduledFor) {
    return publishTeacherPublication(ctx, copy.id, resolvedTargetIds);
  }

  return {
    publication: await mapPublicationDetail(db, copy.id),
    action: "retried"
  };
}

export async function listTeacherPublicationTargets(): Promise<{ targets: PublicationTargetSummary[]; health: PublicationProviderHealth[] }> {
  const db = getDbSafe();
  const health = await getProviderHealth(process.env, fetch);
  const targets = await listPublicationTargets(db, false, health);
  return { targets, health };
}

export async function getPublicationProviderHealth(): Promise<{ health: PublicationProviderHealth[] }> {
  return { health: await getProviderHealth(process.env, fetch) };
}

export async function listOwnerPublicationTargets(): Promise<{ targets: PublicationTargetSummary[]; health: PublicationProviderHealth[] }> {
  const db = getDbSafe();
  const health = await getProviderHealth(process.env, fetch);
  const targets = await listPublicationTargets(db, true, health);
  return { targets, health };
}

export async function createOwnerPublicationTarget(
  _ctx: ServiceContext,
  input: CreatePublicationTargetRequest
): Promise<TargetMutationResult> {
  const db = getDbSafe();
  validateTargetConfig(input.provider, input.config, process.env);
  const [target] = await db
    .insert(publicationTargets)
    .values({
      slug: input.slug,
      title: input.title,
      targetType: input.provider,
      status: input.status,
      config: input.config,
      updatedAt: new Date()
    })
    .returning();

  return {
    target: await mapPublicationTarget(db, target, true, await getProviderHealth(process.env, fetch)),
    action: "created"
  };
}

export async function updateOwnerPublicationTarget(
  _ctx: ServiceContext,
  targetId: string,
  input: UpdatePublicationTargetRequest
): Promise<TargetMutationResult> {
  const db = getDbSafe();
  const existing = await db.query.publicationTargets.findFirst({
    where: (row) => eq(row.id, targetId)
  });
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Publication target not found");
  }

  const nextConfig = input.config ?? (existing.config as PublicationTargetConfig);
  validateTargetConfig(existing.targetType as PublicationProvider, nextConfig, process.env);
  const [updated] = await db
    .update(publicationTargets)
    .set({
      title: input.title ?? existing.title,
      status: input.status ?? existing.status,
      config: nextConfig,
      updatedAt: new Date()
    })
    .where(eq(publicationTargets.id, targetId))
    .returning();

  return {
    target: await mapPublicationTarget(db, updated, true, await getProviderHealth(process.env, fetch)),
    action: "updated"
  };
}

export async function processInternalPublications(options: ProcessOptions = {}): Promise<ProcessPublicationsResponse> {
  const db = getDbSafe();
  const workerId = options.workerId ?? "cron";
  const dueTargets = await claimDueTargets(db, options.limit ?? 20, workerId);
  const result = {
    ok: true,
    claimedCount: dueTargets.length,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
    processedAt: new Date().toISOString()
  };

  for (const target of dueTargets) {
    const outcome = await deliverClaimedTarget(db, target.post, target.target, {
      env: options.env ?? process.env,
      fetchImpl: options.fetchImpl ?? fetch,
      workerId
    });
    if (outcome === "sent") result.sentCount += 1;
    else if (outcome === "failed") result.failedCount += 1;
    else result.skippedCount += 1;
  }

  result.processedAt = new Date().toISOString();
  return result;
}

export function renderPublicationPreview(bodyMd: string, excerpt?: string | null) {
  const pieces = [normalizeNullableText(excerpt), bodyMd.trim()].filter(Boolean);
  return pieces.join("\n\n");
}

export async function processSpecificTargets(targetIds: string[], options: ProcessOptions = {}) {
  const db = getDbSafe();
  for (const targetId of targetIds) {
    const claimed = await claimSpecificTarget(db, targetId, options.workerId ?? "manual");
    if (!claimed) continue;
    await deliverClaimedTarget(db, claimed.post, claimed.target, {
      env: options.env ?? process.env,
      fetchImpl: options.fetchImpl ?? fetch,
      workerId: options.workerId ?? "manual"
    });
  }
}

function getDbSafe() {
  try {
    return getDb();
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }
    throw new SetupRequiredError();
  }
}

async function requirePost(db: Db, postId: string) {
  const post = await db.query.socialPosts.findFirst({
    where: (row) => eq(row.id, postId)
  });
  if (!post) throw new ApiError(404, "NOT_FOUND", "Publication not found");
  return post;
}

async function requireEditablePost(db: Db, postId: string) {
  const post = await requirePost(db, postId);
  if (post.status !== "draft" && post.status !== "scheduled") {
    throw new ApiError(409, "CONFLICT", "Only draft or scheduled publications are editable");
  }
  return post;
}

async function requirePublishablePost(db: Db, postId: string) {
  const post = await requirePost(db, postId);
  if (post.status === "published") {
    throw new ApiError(409, "CONFLICT", "Published publications are immutable");
  }
  return post;
}

async function replacePostTargets(
  db: Db,
  post: DbSocialPost,
  targetIds: string[],
  status: "pending" | "scheduled",
  scheduledFor?: Date
) {
  if (targetIds.length === 0) {
    await db.delete(socialPostTargets).where(eq(socialPostTargets.socialPostId, post.id));
    return;
  }

  const targets = await db.query.publicationTargets.findMany({
    where: (row) => inArray(row.id, targetIds)
  });
  if (targets.length !== targetIds.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "One or more publication targets do not exist");
  }

  await db.delete(socialPostTargets).where(eq(socialPostTargets.socialPostId, post.id));
  await db.insert(socialPostTargets).values(
    targets.map((target) => ({
      socialPostId: post.id,
      publicationTargetId: target.id,
      postRevision: post.revision,
      status,
      scheduledFor: scheduledFor ?? null,
      metadata: {},
      updatedAt: new Date()
    }))
  );
}

async function syncExistingTargetSchedule(db: Db, postId: string, scheduledFor: Date | undefined, isScheduled: boolean) {
  const targets = await db.query.socialPostTargets.findMany({
    where: (row) => eq(row.socialPostId, postId)
  });
  if (targets.length === 0) return;

  for (const target of targets) {
    await db
      .update(socialPostTargets)
      .set({
        status: isScheduled ? "scheduled" : "pending",
        scheduledFor: scheduledFor ?? null,
        updatedAt: new Date()
      })
      .where(eq(socialPostTargets.id, target.id));
  }
}

async function currentTargetIds(db: Db, postId: string) {
  const rows = await db.query.socialPostTargets.findMany({
    where: (row) => eq(row.socialPostId, postId)
  });
  return rows.map((row) => row.publicationTargetId);
}

async function mapPublicationSummary(db: Db, post: DbSocialPost): Promise<PublicationSummary> {
  const targets = await db.query.socialPostTargets.findMany({
    where: (row) => eq(row.socialPostId, post.id),
    orderBy: (row, { asc: orderAsc }) => [orderAsc(row.createdAt)]
  });
  return {
    id: post.id,
    duplicateOfPostId: post.duplicateOfPostId,
    revision: post.revision,
    title: post.title,
    excerpt: post.excerpt,
    bodyMd: post.bodyMd,
    audience: post.audience,
    contentHash: post.contentHash,
    status: post.status as PublicationPostStatus,
    scheduledFor: toIso(post.scheduledFor),
    publishedAt: toIso(post.publishedAt),
    publishAllowed: post.publishAllowed,
    createdAt: requiredIso(post.createdAt),
    updatedAt: requiredIso(post.updatedAt),
    targets: await Promise.all(targets.map((target) => mapPublicationTargetReference(db, target)))
  };
}

async function mapPublicationDetail(db: Db, postId: string): Promise<PublicationDetail> {
  const post = await requirePost(db, postId);
  const summary = await mapPublicationSummary(db, post);
  const postTargets = await db.query.socialPostTargets.findMany({
    where: (row) => eq(row.socialPostId, post.id)
  });
  const deliveries = await db.query.socialDeliveries.findMany({
    where: (row) => inArray(row.socialPostTargetId, postTargets.map((target) => target.id).length > 0 ? postTargets.map((target) => target.id) : ["00000000-0000-0000-0000-000000000000"]),
    orderBy: (row, { desc: orderDesc }) => [orderDesc(row.createdAt)]
  });
  const history = await db.query.publicationEvents.findMany({
    where: (row) => eq(row.socialPostId, post.id),
    orderBy: (row, { desc: orderDesc }) => [orderDesc(row.createdAt)]
  });

  return {
    ...summary,
    metadata: (post.metadata as Record<string, unknown>) ?? {},
    deliveries: deliveries.map((delivery) => ({
      id: delivery.id,
      provider: delivery.provider as PublicationProvider,
      status: delivery.status,
      attemptNo: delivery.attemptNo,
      idempotencyKey: delivery.idempotencyKey,
      providerMessageId: delivery.providerMessageId,
      claimedAt: toIso(delivery.claimedAt),
      claimedBy: delivery.claimedBy,
      deliveredAt: toIso(delivery.deliveredAt),
      nextAttemptAt: toIso(delivery.nextAttemptAt),
      errorCode: delivery.errorCode,
      errorMessage: delivery.errorMessage,
      createdAt: requiredIso(delivery.createdAt),
      updatedAt: requiredIso(delivery.updatedAt)
    })),
    history: history.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      createdAt: requiredIso(event.createdAt),
      actorUserId: event.actorUserId,
      payload: (event.payload as Record<string, unknown>) ?? {}
    }))
  };
}

async function mapPublicationTargetReference(db: Db, target: DbSocialPostTarget) {
  const publicationTargetRow = await db.query.publicationTargets.findFirst({
    where: (row) => eq(row.id, target.publicationTargetId)
  });
  const deliveries = await db.query.socialDeliveries.findMany({
    where: (row) => eq(row.socialPostTargetId, target.id),
    orderBy: (row, { desc: orderDesc }) => [orderDesc(row.createdAt)]
  });
  return {
    id: target.publicationTargetId,
    title: publicationTargetRow?.title ?? "Unknown target",
    provider: (publicationTargetRow?.targetType ?? "telegram") as PublicationProvider,
    status: target.status,
    scheduledFor: toIso(target.scheduledFor),
    publishedAt: toIso(target.publishedAt),
    revision: target.postRevision,
    deliveryCount: deliveries.length,
    latestDeliveryStatus: deliveries[0]?.status ?? null
  };
}

async function mapPublicationTarget(
  db: Db,
  target: DbPublicationTarget,
  ownerView: boolean,
  health: PublicationProviderHealth[]
): Promise<PublicationTargetSummary> {
  const config = (target.config as PublicationTargetConfig) ?? {};
  const recipientMode = config.recipientMode ?? "static";
  const recipientCount = target.targetType === "telegram" && recipientMode === "subscriber-opt-in"
    ? await countActiveTelegramSubscribers(db)
    : 1;
  const providerHealth = health.find((entry) => entry.provider === target.targetType);

  return {
    id: target.id,
    slug: target.slug,
    title: target.title,
    provider: target.targetType as PublicationProvider,
    status: target.status as PublicationTargetStatus,
    config: ownerView ? config : sanitizeTargetConfig(config),
    lastPublishedAt: toIso(target.lastPublishedAt),
    recipientMode,
    recipientCount,
    isEditableByOwner: true,
    healthStatus: providerHealth?.status ?? "setup_required",
    healthMessage: providerHealth?.message ?? "Provider is not configured",
    createdAt: requiredIso(target.createdAt),
    updatedAt: requiredIso(target.updatedAt)
  };
}

async function listPublicationTargets(db: Db, ownerView: boolean, health: PublicationProviderHealth[]) {
  const rows = await db.query.publicationTargets.findMany({
    orderBy: (row, { asc: orderAsc }) => [orderAsc(row.title)]
  });
  const visibleRows = ownerView ? rows : rows.filter((row) => row.status === "active");
  return Promise.all(visibleRows.map((target) => mapPublicationTarget(db, target, ownerView, health)));
}

async function countActiveTelegramSubscribers(db: Db) {
  const rows = await db.query.telegramSubscribers.findMany({
    where: (row) => and(eq(row.isActive, true), eq(row.chatType, "private"))
  });
  return rows.length;
}

async function getProviderHealth(env: NodeJS.ProcessEnv, fetchImpl?: OptionalFetch) {
  const providers = [
    createTelegramProvider(env, fetchImpl),
    createVkProvider(env)
  ];
  return Promise.all(providers.map((provider) => provider.getHealth()));
}

export function createTelegramProvider(env: NodeJS.ProcessEnv, fetchImpl: OptionalFetch = fetch): PublicationProviderAdapter {
  let initialized = false;
  const botToken = normalizeEnvValue(env.TELEGRAM_BOT_TOKEN);
  const doFetch = fetchImpl ?? fetch;

  const baseUrl = botToken ? `https://api.telegram.org/bot${botToken}` : null;
  async function call(path: string, body?: unknown) {
    initialized = true;
    if (!baseUrl) {
      throw new ApiError(503, "SETUP_REQUIRED", "Telegram bot token is not configured");
    }
    return doFetch(`${baseUrl}/${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  return {
    provider: "telegram",
    async getHealth() {
      if (!botToken) {
        return {
          provider: "telegram",
          status: "setup_required",
          message: "TELEGRAM_BOT_TOKEN is not configured",
          checkedAt: new Date().toISOString()
        };
      }

      try {
        const response = await call("getMe");
        const payload = await safeJson(response);
        const ok = Boolean(response.ok && payload && typeof payload === "object" && "ok" in payload && payload.ok === true);
        return {
          provider: "telegram",
          status: ok ? "ok" : "error",
          message: ok ? `Telegram Bot API reachable${initialized ? "" : ""}` : "Telegram Bot API health check failed",
          checkedAt: new Date().toISOString()
        };
      } catch {
        return {
          provider: "telegram",
          status: "error",
          message: "Telegram Bot API health check failed",
          checkedAt: new Date().toISOString()
        };
      }
    },
    async send(input) {
      const config = (input.target.config as PublicationTargetConfig) ?? {};
      const recipientMode = config.recipientMode ?? "static";
      const recipients = recipientMode === "subscriber-opt-in"
        ? await listTelegramSubscriberChatIds()
        : [String(config.chatId ?? "")];
      const allowedChatIds = readAllowedChatIds(env);
      const filteredRecipients = recipients.filter((chatId) => allowedChatIds.has(chatId));
      if (filteredRecipients.length === 0) {
        return {
          status: "failed",
          errorCode: "TARGET_NOT_ALLOWED",
          errorMessage: "Telegram target is not allowed by server configuration."
        };
      }

      const result = await Promise.all(
        filteredRecipients.map(async (chatId) => {
          try {
            const response = await call("sendMessage", {
              chat_id: chatId,
              text: input.text,
              disable_web_page_preview: true
            });
            const payload = await safeJson(response);
            if (!response.ok || !payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true) {
              return {
                status: "failed" as const,
                errorCode: String(response.status),
                errorMessage: "Telegram sendMessage failed"
              };
            }
            const providerMessageId = typeof payload.result === "object" && payload.result && "message_id" in payload.result
              ? String(payload.result.message_id)
              : undefined;
            return { status: "sent" as const, providerMessageId };
          } catch {
            return {
              status: "failed" as const,
              errorCode: "NETWORK_ERROR",
              errorMessage: "Telegram sendMessage request failed"
            };
          }
        })
      );

      const failure = result.find((entry) => entry.status === "failed");
      if (failure) {
        return failure;
      }
      return {
        status: "sent",
        providerMessageId: result.map((entry) => entry.providerMessageId).filter(Boolean).join(",")
      };
    }
  };
}

export function createVkProvider(env: NodeJS.ProcessEnv): PublicationProviderAdapter {
  const token = normalizeEnvValue(env.VK_ACCESS_TOKEN);
  const groupId = normalizeEnvValue(env.VK_GROUP_ID);
  return {
    provider: "vk",
    async getHealth() {
      return {
        provider: "vk",
        status: token && groupId ? "ok" : "setup_required",
        message: token && groupId ? "VK credentials are configured; live send remains disabled." : "VK_ACCESS_TOKEN or VK_GROUP_ID is missing",
        checkedAt: new Date().toISOString()
      };
    },
    async send() {
      return {
        status: "failed",
        errorCode: "LIVE_SEND_DISABLED",
        errorMessage: "VK live send is disabled in this build."
      };
    }
  };
}

async function listTelegramSubscriberChatIds() {
  const db = getDbSafe();
  const subscribers = await db.query.telegramSubscribers.findMany({
    where: (row) => and(eq(row.isActive, true), eq(row.chatType, "private")),
    orderBy: (row, { asc: orderAsc }) => [orderAsc(row.createdAt)]
  });
  return subscribers.map((subscriber) => subscriber.chatId);
}

async function claimDueTargets(db: Db, limit: number, workerId: string) {
  const due = await db.query.socialPostTargets.findMany({
    where: (row) => and(
      eq(row.status, "scheduled"),
      or(lte(row.scheduledFor, new Date()), eq(row.scheduledFor, null as never))
    ),
    orderBy: (row, { asc: orderAsc }) => [orderAsc(row.scheduledFor), orderAsc(row.createdAt)],
    limit
  });

  const claimed: Array<{ target: DbSocialPostTarget; post: DbSocialPost }> = [];
  for (const row of due) {
    const [updated] = await db
      .update(socialPostTargets)
      .set({
        status: "publishing",
        updatedAt: new Date(),
        scheduledFor: row.scheduledFor ?? new Date()
      })
      .where(and(eq(socialPostTargets.id, row.id), eq(socialPostTargets.status, "scheduled")))
      .returning();
    if (!updated) continue;
    const post = await requirePost(db, updated.socialPostId);
    claimed.push({ target: updated, post });
    await db
      .update(socialPosts)
      .set({ status: "publishing", updatedAt: new Date() })
      .where(eq(socialPosts.id, post.id));
    await insertPublicationEvent(db, {
      socialPostId: post.id,
      socialPostTargetId: updated.id,
      eventType: "publish_started",
      payload: { workerId }
    });
  }
  return claimed;
}

async function claimSpecificTarget(db: Db, targetId: string, workerId: string) {
  const target = await db.query.socialPostTargets.findFirst({
    where: (row) => eq(row.id, targetId)
  });
  if (!target || (target.status !== "scheduled" && target.status !== "failed" && target.status !== "pending")) return null;
  const [updated] = await db
    .update(socialPostTargets)
    .set({
      status: "publishing",
      scheduledFor: target.scheduledFor ?? new Date(),
      updatedAt: new Date()
    })
    .where(and(eq(socialPostTargets.id, target.id), inArray(socialPostTargets.status, [target.status])))
    .returning();
  if (!updated) return null;
  const post = await requirePost(db, updated.socialPostId);
  await db.update(socialPosts).set({ status: "publishing", updatedAt: new Date() }).where(eq(socialPosts.id, post.id));
  await insertPublicationEvent(db, {
    socialPostId: post.id,
    socialPostTargetId: updated.id,
    eventType: "publish_started",
    payload: { workerId, mode: "manual" }
  });
  return { target: updated, post };
}

async function deliverClaimedTarget(
  db: Db,
  post: DbSocialPost,
  postTarget: DbSocialPostTarget,
  options: Required<Pick<ProcessOptions, "env" | "workerId">> & { fetchImpl?: OptionalFetch }
) {
  const target = await db.query.publicationTargets.findFirst({
    where: (row) => eq(row.id, postTarget.publicationTargetId)
  });
  if (!target) {
    await markTargetFailed(db, post, postTarget, "TARGET_NOT_FOUND", "Publication target no longer exists");
    return "failed";
  }

  const idempotencyKey = buildDeliveryKey(post.id, target.id, post.revision);
  const delivery = await ensureDeliveryRecord(db, postTarget, target.targetType as PublicationProvider, idempotencyKey, options.workerId);
  if (!delivery) {
    return "skipped";
  }

  const provider = target.targetType === "telegram"
    ? createTelegramProvider(options.env, options.fetchImpl)
    : createVkProvider(options.env);
  const result = await provider.send({
    post,
    target,
    text: renderPublicationPreview(post.bodyMd, post.excerpt)
  });

  if (result.status === "sent") {
    await db
      .update(socialDeliveries)
      .set({
        status: "sent",
        providerMessageId: result.providerMessageId,
        deliveredAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(socialDeliveries.id, delivery.id));
    await db
      .update(socialPostTargets)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(socialPostTargets.id, postTarget.id));
    await insertPublicationEvent(db, {
      socialPostId: post.id,
      socialPostTargetId: postTarget.id,
      socialDeliveryId: delivery.id,
      eventType: "published",
      payload: { providerMessageId: result.providerMessageId }
    });
    await maybeFinalizePost(db, post.id);
    return "sent";
  }

  await markTargetFailed(db, post, postTarget, result.errorCode ?? "DELIVERY_FAILED", result.errorMessage ?? "Delivery failed", delivery.id);
  return "failed";
}

async function ensureDeliveryRecord(
  db: Db,
  postTarget: DbSocialPostTarget,
  provider: PublicationProvider,
  idempotencyKey: string,
  workerId: string
) {
  const existing = await db.query.socialDeliveries.findFirst({
    where: (row) => eq(row.idempotencyKey, idempotencyKey)
  });
  if (existing?.status === "sent") {
    return undefined;
  }
  if (existing) {
    return existing;
  }
  const [delivery] = await db
    .insert(socialDeliveries)
    .values({
      socialPostTargetId: postTarget.id,
      idempotencyKey,
      attemptNo: 1,
      provider,
      status: "pending",
      claimedAt: new Date(),
      claimedBy: workerId,
      payload: {}
    })
    .onConflictDoNothing({ target: socialDeliveries.idempotencyKey })
    .returning();
  return delivery;
}

async function markTargetFailed(
  db: Db,
  post: DbSocialPost,
  postTarget: DbSocialPostTarget,
  errorCode: string,
  errorMessage: string,
  deliveryId?: string
) {
  const safeMessage = redactSecrets(errorMessage);
  await db
    .update(socialPostTargets)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(socialPostTargets.id, postTarget.id));
  if (deliveryId) {
    await db
      .update(socialDeliveries)
      .set({
        status: "failed",
        errorCode,
        errorMessage: safeMessage,
        updatedAt: new Date()
      })
      .where(eq(socialDeliveries.id, deliveryId));
  }
  await db
    .update(socialPosts)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(socialPosts.id, post.id));
  await insertPublicationEvent(db, {
    socialPostId: post.id,
    socialPostTargetId: postTarget.id,
    socialDeliveryId: deliveryId,
    eventType: "delivery_failed",
    payload: { errorCode, errorMessage: safeMessage }
  });
}

async function maybeFinalizePost(db: Db, postId: string) {
  const targets = await db.query.socialPostTargets.findMany({
    where: (row) => eq(row.socialPostId, postId)
  });
  if (targets.length === 0) return;
  const hasFailed = targets.some((target) => target.status === "failed");
  const allPublished = targets.every((target) => target.status === "published");
  if (!hasFailed && !allPublished) return;

  await db
    .update(socialPosts)
    .set({
      status: hasFailed ? "failed" : "published",
      publishedAt: allPublished ? new Date() : undefined,
      updatedAt: new Date()
    })
    .where(eq(socialPosts.id, postId));

  const targetIds = targets.map((target) => target.publicationTargetId);
  if (!hasFailed && targetIds.length > 0) {
    await db
      .update(publicationTargets)
      .set({ lastPublishedAt: new Date(), updatedAt: new Date() })
      .where(inArray(publicationTargets.id, targetIds));
  }
}

async function insertPublicationEvent(
  db: Db,
  input: Partial<DbPublicationEvent> & Pick<DbPublicationEvent, "eventType">
) {
  await db.insert(publicationEvents).values({
    socialPostId: input.socialPostId ?? null,
    socialPostTargetId: input.socialPostTargetId ?? null,
    socialDeliveryId: input.socialDeliveryId ?? null,
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    payload: (input.payload as Record<string, unknown>) ?? {}
  });
}

export function buildDeliveryKey(postId: string, targetId: string, revision: number) {
  return `${postId}:${targetId}:${revision}`;
}

function validateTargetConfig(provider: PublicationProvider, config: Record<string, unknown>, env: NodeJS.ProcessEnv) {
  const targetConfig = (config as PublicationTargetConfig) ?? {};
  const recipientMode = targetConfig.recipientMode ?? "static";
  if (provider === "telegram" && recipientMode === "static") {
    const chatId = typeof targetConfig.chatId === "string" ? targetConfig.chatId.trim() : "";
    if (!chatId) {
      throw new ApiError(400, "VALIDATION_ERROR", "Telegram static targets require config.chatId");
    }
    if (!readAllowedChatIds(env).has(chatId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Telegram static target chatId is not allowed by TELEGRAM_ALLOWED_CHAT_IDS");
    }
  }

  if (provider === "telegram" && recipientMode === "subscriber-opt-in" && "chatId" in targetConfig) {
    throw new ApiError(400, "VALIDATION_ERROR", "Subscriber opt-in Telegram targets must not define chatId");
  }
}

function sanitizeTargetConfig(config: PublicationTargetConfig) {
  const { chatId: _chatId, ...rest } = config;
  return rest;
}

function readAllowedChatIds(env: NodeJS.ProcessEnv) {
  return new Set(
    normalizeEnvValue(env.TELEGRAM_ALLOWED_CHAT_IDS)
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function requiredIso(value: Date | null | undefined) {
  if (!value) return new Date(0).toISOString();
  return value.toISOString();
}

function hashContent(title: string, bodyMd: string) {
  return createHash("sha256").update(`${title}\n${bodyMd}`).digest("hex");
}

function redactSecrets(value: string) {
  return value
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, "[redacted-token]")
    .replace(/https:\/\/api\.telegram\.org\/bot[^\s]+/g, "[redacted-url]")
    .slice(0, 300);
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
