import { randomUUID } from "node:crypto";
import type { ServiceContext } from "@eduferma/core/services";
import type {
  CreatePublicationRequest,
  CreatePublicationTargetRequest,
  PublicationDetail,
  PublicationProviderHealth,
  PublicationSummary,
  PublicationTargetSummary,
  ProcessPublicationsResponse,
  PublicationRetryRequest,
  UpdatePublicationRequest,
  UpdatePublicationTargetRequest
} from "@eduferma/validators";
import { ApiError } from "@/server/api/responses";

type DemoPublicationMutation = {
  publication: PublicationDetail;
  action: "created" | "updated" | "published" | "scheduled" | "cancelled" | "retried";
};

type DemoTargetMutation = {
  target: PublicationTargetSummary;
  action: "created" | "updated" | "archived";
};

const nowIso = () => new Date().toISOString();

const demoHealth: PublicationProviderHealth[] = [
  {
    provider: "telegram",
    status: "ok",
    message: "Telegram mock provider is ready for demo E2E.",
    checkedAt: nowIso()
  },
  {
    provider: "vk",
    status: "setup_required",
    message: "VK mock contract is available; live send is disabled.",
    checkedAt: nowIso()
  }
];

const demoTelegramTargetId = "4198f0a5-7d16-4cde-915f-7022fe60472b";

type DemoPublicationState = {
  targets: PublicationTargetSummary[];
  posts: PublicationDetail[];
};

const demoGlobal = globalThis as typeof globalThis & {
  __edufermaPublicationDemoState?: DemoPublicationState;
};

const demoState =
  demoGlobal.__edufermaPublicationDemoState ??
  (demoGlobal.__edufermaPublicationDemoState = {
    targets: [
      {
        id: demoTelegramTargetId,
        slug: "demo-owner-private",
        title: "Demo owner private Telegram",
        provider: "telegram",
        status: "active",
        config: { recipientMode: "static", chatId: "demo-owner-chat" },
        lastPublishedAt: null,
        recipientMode: "static",
        recipientCount: 1,
        isEditableByOwner: true,
        healthStatus: "ok",
        healthMessage: "Telegram mock provider is ready for demo E2E.",
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    ],
    posts: []
  });

const targets = demoState.targets;
const posts = demoState.posts;

export function isPublicationDemoMode() {
  return process.env.ENABLE_DEMO_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function listDemoPublications(): { posts: PublicationSummary[] } {
  return {
    posts: posts
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toSummary)
  };
}

export function createDemoPublication(
  _ctx: ServiceContext,
  input: CreatePublicationRequest
): DemoPublicationMutation {
  if (input.scheduledFor && !input.publishAllowed) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Scheduled publications must be explicitly approved for delivery"
    );
  }
  validateDemoTargets(input.targetIds);
  const createdAt = nowIso();
  const scheduledFor = input.scheduledFor ?? null;
  const post: PublicationDetail = {
    id: randomUUID(),
    duplicateOfPostId: null,
    revision: 1,
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    bodyMd: input.bodyMd.trim(),
    audience: input.audience?.trim() || null,
    contentHash: null,
    status: scheduledFor ? "scheduled" : "draft",
    scheduledFor,
    publishedAt: null,
    publishAllowed: input.publishAllowed,
    createdAt,
    updatedAt: createdAt,
    targets: input.targetIds.map((targetId) =>
      targetReference(targetId, scheduledFor ? "scheduled" : "pending", scheduledFor)
    ),
    metadata: input.metadata ?? {},
    deliveries: [],
    history: [
      {
        id: randomUUID(),
        eventType: "created",
        createdAt,
        actorUserId: null,
        payload: { targetIds: input.targetIds }
      }
    ]
  };
  posts.push(post);
  return { publication: clone(post), action: "created" };
}

export function getDemoPublication(postId: string) {
  return { publication: clone(requireDemoPost(postId)) };
}

export function updateDemoPublication(
  _ctx: ServiceContext,
  postId: string,
  input: UpdatePublicationRequest
): DemoPublicationMutation {
  const post = requireDemoEditablePost(postId);
  const targetIds = input.targetIds ?? post.targets.map((target) => target.id);
  validateDemoTargets(targetIds);
  const scheduledFor =
    input.scheduledFor === undefined ? post.scheduledFor : input.scheduledFor;
  const publishAllowed = input.publishAllowed ?? post.publishAllowed;
  if (scheduledFor && !publishAllowed) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Scheduled publications must be explicitly approved for delivery"
    );
  }
  const updatedAt = nowIso();
  Object.assign(post, {
    title: input.title?.trim() ?? post.title,
    excerpt:
      input.excerpt === undefined ? post.excerpt : input.excerpt?.trim() || null,
    bodyMd: input.bodyMd?.trim() ?? post.bodyMd,
    audience:
      input.audience === undefined ? post.audience : input.audience?.trim() || null,
    publishAllowed,
    scheduledFor,
    status: scheduledFor ? "scheduled" : "draft",
    metadata: input.metadata ?? post.metadata,
    updatedAt,
    targets: targetIds.map((targetId) =>
      targetReference(targetId, scheduledFor ? "scheduled" : "pending", scheduledFor)
    )
  });
  post.history.unshift({
    id: randomUUID(),
    eventType: "updated",
    createdAt: updatedAt,
    actorUserId: null,
    payload: { updatedFields: Object.keys(input) }
  });
  return { publication: clone(post), action: "updated" };
}

export function publishDemoPublication(
  _ctx: ServiceContext,
  postId: string,
  targetIds?: string[]
): DemoPublicationMutation {
  const post = requireDemoEditablePost(postId);
  if (!post.publishAllowed) {
    throw new ApiError(409, "CONFLICT", "Publication is not approved for delivery");
  }
  const resolvedTargetIds =
    targetIds && targetIds.length > 0
      ? targetIds
      : post.targets.map((target) => target.id);
  validateDemoTargets(resolvedTargetIds);
  if (resolvedTargetIds.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "At least one target is required");
  }
  const deliveredAt = nowIso();
  const failedTargetIds = resolvedTargetIds.filter(
    (targetId) => requireDemoTarget(targetId).provider === "vk"
  );
  post.status = failedTargetIds.length > 0 ? "failed" : "published";
  post.scheduledFor = null;
  post.publishedAt = failedTargetIds.length > 0 ? null : deliveredAt;
  post.updatedAt = deliveredAt;
  post.targets = resolvedTargetIds.map((targetId) => {
    const failed = failedTargetIds.includes(targetId);
    return {
      ...targetReference(
        targetId,
        failed ? "failed" : "published",
        null,
        post.revision
      ),
      publishedAt: failed ? null : deliveredAt,
      deliveryCount: 1,
      latestDeliveryStatus: failed ? "failed" : "sent"
    };
  });
  post.deliveries.unshift(
    ...resolvedTargetIds.map((targetId) => {
      const target = requireDemoTarget(targetId);
      const failed = target.provider === "vk";
      return {
        id: randomUUID(),
        provider: target.provider,
        status: failed ? ("failed" as const) : ("sent" as const),
        attemptNo: 1,
        idempotencyKey: `${post.id}:${targetId}:${post.revision}`,
        providerMessageId: failed
          ? null
          : `demo-message-${targetId}-${post.revision}`,
        claimedAt: deliveredAt,
        claimedBy: "demo",
        deliveredAt: failed ? null : deliveredAt,
        nextAttemptAt: null,
        errorCode: failed ? "LIVE_SEND_DISABLED" : null,
        errorMessage: failed
          ? "VK live delivery is disabled until production setup is complete."
          : null,
        createdAt: deliveredAt,
        updatedAt: deliveredAt
      };
    })
  );
  post.history.unshift({
    id: randomUUID(),
    eventType: failedTargetIds.length > 0 ? "delivery_failed" : "published",
    createdAt: deliveredAt,
    actorUserId: null,
    payload: {
      providerMessageIds: resolvedTargetIds
        .filter((targetId) => !failedTargetIds.includes(targetId))
        .map((targetId) => `demo-message-${targetId}-${post.revision}`),
      failedTargetIds,
      errorCode: failedTargetIds.length > 0 ? "LIVE_SEND_DISABLED" : undefined
    }
  });
  return { publication: clone(post), action: "published" };
}

export function scheduleDemoPublication(
  _ctx: ServiceContext,
  postId: string,
  scheduledFor: string,
  targetIds?: string[]
): DemoPublicationMutation {
  const post = requireDemoEditablePost(postId);
  const resolvedTargetIds =
    targetIds && targetIds.length > 0
      ? targetIds
      : post.targets.map((target) => target.id);
  validateDemoTargets(resolvedTargetIds);
  if (resolvedTargetIds.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "At least one target is required");
  }
  const updatedAt = nowIso();
  post.status = "scheduled";
  post.publishAllowed = true;
  post.scheduledFor = scheduledFor;
  post.updatedAt = updatedAt;
  post.targets = resolvedTargetIds.map((targetId) =>
    targetReference(targetId, "scheduled", scheduledFor, post.revision)
  );
  post.history.unshift({
    id: randomUUID(),
    eventType: "scheduled",
    createdAt: updatedAt,
    actorUserId: null,
    payload: { scheduledFor }
  });
  return { publication: clone(post), action: "scheduled" };
}

export function cancelDemoPublicationSchedule(
  _ctx: ServiceContext,
  postId: string
): DemoPublicationMutation {
  const post = requireDemoEditablePost(postId);
  if (post.status !== "scheduled") {
    throw new ApiError(409, "CONFLICT", "Only scheduled publications can be cancelled");
  }
  const updatedAt = nowIso();
  post.status = "draft";
  post.scheduledFor = null;
  post.updatedAt = updatedAt;
  post.targets = post.targets.map((target) => ({
    ...target,
    status: "pending",
    scheduledFor: null
  }));
  post.history.unshift({
    id: randomUUID(),
    eventType: "schedule_cancelled",
    createdAt: updatedAt,
    actorUserId: null,
    payload: {}
  });
  return { publication: clone(post), action: "cancelled" };
}

export function retryDemoPublication(
  ctx: ServiceContext,
  postId: string,
  input: PublicationRetryRequest
): DemoPublicationMutation {
  const original = requireDemoPost(postId);
  if (original.status !== "published" && original.status !== "failed") {
    throw new ApiError(
      409,
      "CONFLICT",
      "Only published or failed publications can be retried"
    );
  }
  const result = createDemoPublication(ctx, {
    title: original.title,
    excerpt: original.excerpt,
    bodyMd: original.bodyMd,
    audience: original.audience,
    publishAllowed: original.publishAllowed,
    targetIds:
      input.targetIds && input.targetIds.length > 0
        ? input.targetIds
        : original.targets.map((target) => target.id),
    scheduledFor: input.scheduledFor,
    metadata: { ...original.metadata, retriedFromPostId: original.id }
  });
  const copy = posts.find((post) => post.id === result.publication.id)!;
  copy.duplicateOfPostId = original.id;
  copy.revision = original.revision + 1;
  copy.targets = copy.targets.map((target) => ({
    ...target,
    revision: copy.revision
  }));
  copy.history[0] = {
    id: randomUUID(),
    eventType: "retried",
    createdAt: nowIso(),
    actorUserId: null,
    payload: { sourcePostId: original.id }
  };
  if (!input.scheduledFor) {
    const published = publishDemoPublication(ctx, copy.id);
    return { ...published, action: "retried" };
  }
  return { publication: clone(copy), action: "retried" };
}

export function listDemoPublicationTargets(ownerView: boolean) {
  const visible = ownerView
    ? targets
    : targets.filter((target) => target.status === "active");
  return {
    targets: visible.map((target) => ({
      ...clone(target),
      config: ownerView
        ? clone(target.config)
        : Object.fromEntries(
            Object.entries(target.config).filter(([key]) => key !== "chatId")
          )
    })),
    health: clone(demoHealth)
  };
}

export function getDemoProviderHealth() {
  return { health: clone(demoHealth) };
}

export function createDemoPublicationTarget(
  _ctx: ServiceContext,
  input: CreatePublicationTargetRequest
): DemoTargetMutation {
  if (targets.some((target) => target.slug === input.slug)) {
    throw new ApiError(409, "CONFLICT", "Publication target slug already exists");
  }
  const createdAt = nowIso();
  const target: PublicationTargetSummary = {
    id: randomUUID(),
    slug: input.slug,
    title: input.title,
    provider: input.provider,
    status: input.status,
    config: clone(input.config),
    lastPublishedAt: null,
    recipientMode:
      input.config.recipientMode === "subscriber-opt-in"
        ? "subscriber-opt-in"
        : "static",
    recipientCount: 1,
    isEditableByOwner: true,
    healthStatus: input.provider === "telegram" ? "ok" : "setup_required",
    healthMessage:
      input.provider === "telegram"
        ? "Telegram mock provider is ready for demo E2E."
        : "VK mock contract is available; live send is disabled.",
    createdAt,
    updatedAt: createdAt
  };
  targets.push(target);
  return { target: clone(target), action: "created" };
}

export function updateDemoPublicationTarget(
  _ctx: ServiceContext,
  targetId: string,
  input: UpdatePublicationTargetRequest
): DemoTargetMutation {
  const target = requireDemoTarget(targetId);
  target.title = input.title ?? target.title;
  target.status = input.status ?? target.status;
  target.config = input.config ? clone(input.config) : target.config;
  target.recipientMode =
    target.config.recipientMode === "subscriber-opt-in"
      ? "subscriber-opt-in"
      : "static";
  target.updatedAt = nowIso();
  return { target: clone(target), action: "updated" };
}

export function archiveDemoPublicationTarget(
  _ctx: ServiceContext,
  targetId: string
): DemoTargetMutation {
  const target = requireDemoTarget(targetId);
  const hasActionableLinks = posts.some((post) =>
    post.targets.some(
      (postTarget) =>
        postTarget.id === targetId &&
        ["pending", "scheduled", "publishing"].includes(postTarget.status)
    )
  );
  if (hasActionableLinks) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Publication target has pending or scheduled deliveries and cannot be archived"
    );
  }
  target.status = "archived";
  target.updatedAt = nowIso();
  return { target: clone(target), action: "archived" };
}

export function processDemoPublications(limit = 20): ProcessPublicationsResponse {
  const due = posts
    .filter(
      (post) =>
        post.status === "scheduled" &&
        post.publishAllowed &&
        Boolean(post.scheduledFor) &&
        new Date(post.scheduledFor!).getTime() <= Date.now()
    )
    .slice(0, limit);
  let sentCount = 0;
  let failedCount = 0;
  for (const post of due) {
    const result = publishDemoPublication(
      {
        user: {
          id: "demo-cron",
          email: "cron@example.com",
          role: "owner"
        }
      },
      post.id
    );
    if (result.publication.status === "failed") failedCount += 1;
    else sentCount += 1;
  }
  return {
    ok: true,
    claimedCount: due.length,
    sentCount,
    failedCount,
    skippedCount: 0,
    processedAt: nowIso()
  };
}

function targetReference(
  targetId: string,
  status: "pending" | "scheduled" | "published" | "failed",
  scheduledFor: string | null,
  revision = 1
) {
  const target = requireDemoTarget(targetId);
  return {
    id: target.id,
    title: target.title,
    provider: target.provider,
    status,
    scheduledFor,
    publishedAt: null,
    revision,
    deliveryCount: 0,
    latestDeliveryStatus: null
  } as PublicationDetail["targets"][number];
}

function requireDemoPost(postId: string) {
  const post = posts.find((candidate) => candidate.id === postId);
  if (!post) throw new ApiError(404, "NOT_FOUND", "Publication not found");
  return post;
}

function requireDemoEditablePost(postId: string) {
  const post = requireDemoPost(postId);
  if (post.status !== "draft" && post.status !== "scheduled") {
    throw new ApiError(
      409,
      "CONFLICT",
      post.status === "failed"
        ? "Failed publications must be resent through retry"
        : "Published or in-flight publications are immutable"
    );
  }
  return post;
}

function requireDemoTarget(targetId: string) {
  const target = targets.find((candidate) => candidate.id === targetId);
  if (!target) {
    throw new ApiError(404, "NOT_FOUND", "Publication target not found");
  }
  return target;
}

function validateDemoTargets(targetIds: string[]) {
  const resolved = targetIds.map(requireDemoTarget);
  if (resolved.some((target) => target.status !== "active")) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Only active publication targets can be selected for delivery"
    );
  }
}

function toSummary(post: PublicationDetail): PublicationSummary {
  const { metadata: _metadata, deliveries: _deliveries, history: _history, ...summary } =
    post;
  return clone(summary);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
