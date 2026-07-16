import { AnyPgColumn, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { learningPlans } from "./academics";
import { users } from "./identity";
import {
  publicationEventType,
  publicationTargetStatus,
  publicationTargetType,
  socialDeliveryStatus,
  socialPostStatus,
  socialPostTargetStatus,
  timestamps
} from "./shared";

export const publicationTargets = pgTable(
  "publication_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    targetType: publicationTargetType("target_type").notNull(),
    status: publicationTargetStatus("status").notNull().default("draft"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    slugIdx: uniqueIndex("publication_targets_slug_idx").on(table.slug),
    typeStatusIdx: index("publication_targets_type_status_idx").on(table.targetType, table.status)
  })
);

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    learningPlanId: uuid("learning_plan_id").references(() => learningPlans.id),
    duplicateOfPostId: uuid("duplicate_of_post_id").references((): AnyPgColumn => socialPosts.id),
    revision: integer("revision").notNull().default(1),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyMd: text("body_md").notNull(),
    audience: text("audience"),
    contentHash: text("content_hash"),
    status: socialPostStatus("status").notNull().default("draft"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishAllowed: boolean("publish_allowed").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    statusScheduledIdx: index("social_posts_status_scheduled_idx").on(table.status, table.scheduledFor),
    learningPlanIdx: index("social_posts_learning_plan_idx").on(table.learningPlanId)
  })
);

export const socialPostTargets = pgTable(
  "social_post_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    socialPostId: uuid("social_post_id").notNull().references(() => socialPosts.id),
    publicationTargetId: uuid("publication_target_id").notNull().references(() => publicationTargets.id),
    postRevision: integer("post_revision").notNull().default(1),
    status: socialPostTargetStatus("status").notNull().default("pending"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    postTargetIdx: uniqueIndex("social_post_targets_post_target_revision_idx").on(
      table.socialPostId,
      table.publicationTargetId,
      table.postRevision
    ),
    statusScheduledIdx: index("social_post_targets_status_scheduled_idx").on(table.status, table.scheduledFor)
  })
);

export const socialDeliveries = pgTable(
  "social_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    socialPostTargetId: uuid("social_post_target_id").notNull().references(() => socialPostTargets.id),
    idempotencyKey: text("idempotency_key").notNull(),
    attemptNo: integer("attempt_no").notNull().default(1),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    status: socialDeliveryStatus("status").notNull().default("pending"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimedBy: text("claimed_by"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    targetAttemptIdx: uniqueIndex("social_deliveries_target_attempt_idx").on(table.socialPostTargetId, table.attemptNo),
    idempotencyIdx: uniqueIndex("social_deliveries_idempotency_key_idx").on(table.idempotencyKey),
    statusIdx: index("social_deliveries_status_idx").on(table.status)
  })
);

export const publicationEvents = pgTable(
  "publication_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    socialPostId: uuid("social_post_id").references(() => socialPosts.id),
    socialPostTargetId: uuid("social_post_target_id").references(() => socialPostTargets.id),
    socialDeliveryId: uuid("social_delivery_id").references(() => socialDeliveries.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    eventType: publicationEventType("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    postCreatedIdx: index("publication_events_post_created_idx").on(table.socialPostId, table.createdAt),
    targetCreatedIdx: index("publication_events_target_created_idx").on(table.socialPostTargetId, table.createdAt)
  })
);

export const telegramSubscribers = pgTable(
  "telegram_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    telegramUserId: text("telegram_user_id").notNull(),
    chatId: text("chat_id").notNull(),
    chatType: text("chat_type").notNull().default("private"),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    languageCode: text("language_code"),
    isActive: boolean("is_active").notNull().default(true),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    lastStartAt: timestamp("last_start_at", { withTimezone: true }),
    lastCommandAt: timestamp("last_command_at", { withTimezone: true }),
    source: text("source").notNull().default("telegram_start"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    chatIdIdx: uniqueIndex("telegram_subscribers_chat_id_idx").on(table.chatId),
    userIdx: index("telegram_subscribers_user_idx").on(table.telegramUserId),
    activeIdx: index("telegram_subscribers_active_idx").on(table.isActive)
  })
);

export const telegramBroadcastOutbox = pgTable(
  "telegram_broadcast_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriberId: uuid("subscriber_id").notNull().references(() => telegramSubscribers.id),
    broadcastKey: text("broadcast_key").notNull(),
    chatId: text("chat_id").notNull(),
    messageText: text("message_text").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    subscriberBroadcastIdx: uniqueIndex("telegram_broadcast_outbox_subscriber_broadcast_idx").on(
      table.subscriberId,
      table.broadcastKey
    ),
    statusIdx: index("telegram_broadcast_outbox_status_idx").on(table.status),
    chatIdx: index("telegram_broadcast_outbox_chat_idx").on(table.chatId)
  })
);
