import { z } from "zod";

export const PublicationProviderSchema = z.enum(["telegram", "vk"]);
export const PublicationTargetStatusSchema = z.enum(["draft", "active", "paused", "archived"]);
export const PublicationPostStatusSchema = z.enum(["draft", "scheduled", "publishing", "published", "failed"]);
export const PublicationTargetDeliveryStatusSchema = z.enum(["pending", "scheduled", "publishing", "published", "failed", "cancelled"]);
export const PublicationDeliveryStatusSchema = z.enum(["pending", "scheduled", "sent", "failed", "cancelled"]);
export const PublicationEventTypeSchema = z.enum([
  "created",
  "updated",
  "scheduled",
  "schedule_cancelled",
  "publish_started",
  "published",
  "delivery_failed",
  "retried"
]);

export const PublicationTargetConfigSchema = z.record(z.unknown());
export const PublicationPostMetadataSchema = z.record(z.unknown());
export const NullableDateTimeSchema = z.string().datetime().nullable();

export const PublicationTargetSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  provider: PublicationProviderSchema,
  status: PublicationTargetStatusSchema,
  config: PublicationTargetConfigSchema,
  lastPublishedAt: NullableDateTimeSchema,
  recipientMode: z.enum(["static", "subscriber-opt-in"]),
  recipientCount: z.number().int().nonnegative(),
  isEditableByOwner: z.boolean(),
  healthStatus: z.enum(["ok", "error", "setup_required"]),
  healthMessage: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const PublicationTargetReferenceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  provider: PublicationProviderSchema,
  status: PublicationTargetDeliveryStatusSchema,
  scheduledFor: NullableDateTimeSchema,
  publishedAt: NullableDateTimeSchema,
  revision: z.number().int().positive(),
  deliveryCount: z.number().int().nonnegative(),
  latestDeliveryStatus: PublicationDeliveryStatusSchema.nullable()
});

export const PublicationDeliveryRecordSchema = z.object({
  id: z.string().uuid(),
  provider: PublicationProviderSchema,
  status: PublicationDeliveryStatusSchema,
  attemptNo: z.number().int().positive(),
  idempotencyKey: z.string(),
  providerMessageId: z.string().nullable(),
  claimedAt: NullableDateTimeSchema,
  claimedBy: z.string().nullable(),
  deliveredAt: NullableDateTimeSchema,
  nextAttemptAt: NullableDateTimeSchema,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const PublicationEventRecordSchema = z.object({
  id: z.string().uuid(),
  eventType: PublicationEventTypeSchema,
  createdAt: z.string().datetime(),
  actorUserId: z.string().uuid().nullable(),
  payload: z.record(z.unknown())
});

export const PublicationSummarySchema = z.object({
  id: z.string().uuid(),
  duplicateOfPostId: z.string().uuid().nullable(),
  revision: z.number().int().positive(),
  title: z.string(),
  excerpt: z.string().nullable(),
  bodyMd: z.string(),
  audience: z.string().nullable(),
  contentHash: z.string().nullable(),
  status: PublicationPostStatusSchema,
  scheduledFor: NullableDateTimeSchema,
  publishedAt: NullableDateTimeSchema,
  publishAllowed: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  targets: z.array(PublicationTargetReferenceSchema)
});

export const PublicationDetailSchema = PublicationSummarySchema.extend({
  metadata: PublicationPostMetadataSchema,
  deliveries: z.array(PublicationDeliveryRecordSchema),
  history: z.array(PublicationEventRecordSchema)
});

export const PublicationProviderHealthSchema = z.object({
  provider: PublicationProviderSchema,
  status: z.enum(["ok", "error", "setup_required"]),
  message: z.string(),
  checkedAt: z.string().datetime()
});

export const PublicationListResponseSchema = z.object({
  posts: z.array(PublicationSummarySchema)
});

export const PublicationDetailResponseSchema = z.object({
  publication: PublicationDetailSchema
});

export const PublicationTargetsResponseSchema = z.object({
  targets: z.array(PublicationTargetSummarySchema),
  health: z.array(PublicationProviderHealthSchema)
});

export const PublicationTargetResponseSchema = z.object({
  target: PublicationTargetSummarySchema
});

export const PublicationTargetMutationResponseSchema = z.object({
  target: PublicationTargetSummarySchema,
  action: z.enum(["created", "updated", "archived"])
});

export const PublicationProviderHealthResponseSchema = z.object({
  health: z.array(PublicationProviderHealthSchema)
});

export const PublicationActionResponseSchema = z.object({
  publication: PublicationDetailSchema,
  action: z.enum(["created", "updated", "published", "scheduled", "cancelled", "retried", "processed"])
});

export const ProcessPublicationsResponseSchema = z.object({
  ok: z.boolean(),
  claimedCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  processedAt: z.string().datetime(),
  acceptance: z.object({
    mode: z.enum(["sent-and-verified", "already-sent"]),
    postId: z.string().uuid(),
    sentDeliveryCount: z.literal(1),
    providerMessageId: z.string().min(1)
  }).optional()
});

export const CreatePublicationRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  excerpt: z.string().trim().max(500).optional().nullable(),
  bodyMd: z.string().trim().min(1).max(20_000),
  audience: z.string().trim().max(120).optional().nullable(),
  publishAllowed: z.boolean().default(false),
  targetIds: z.array(z.string().uuid()).default([]),
  scheduledFor: z.string().datetime().optional().nullable(),
  metadata: PublicationPostMetadataSchema.optional()
});

export const UpdatePublicationRequestSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  bodyMd: z.string().trim().min(1).max(20_000).optional(),
  audience: z.string().trim().max(120).optional().nullable(),
  publishAllowed: z.boolean().optional(),
  targetIds: z.array(z.string().uuid()).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  metadata: PublicationPostMetadataSchema.optional()
});

export const PublicationPublishRequestSchema = z.object({
  targetIds: z.array(z.string().uuid()).optional()
});

export const PublicationScheduleRequestSchema = z.object({
  scheduledFor: z.string().datetime(),
  targetIds: z.array(z.string().uuid()).optional()
});

export const PublicationRetryRequestSchema = z.object({
  scheduledFor: z.string().datetime().optional().nullable(),
  targetIds: z.array(z.string().uuid()).optional()
});

export const CreatePublicationTargetRequestSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(160),
  provider: PublicationProviderSchema,
  status: PublicationTargetStatusSchema.default("active"),
  config: PublicationTargetConfigSchema.default({})
});

export const UpdatePublicationTargetRequestSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  status: PublicationTargetStatusSchema.optional(),
  config: PublicationTargetConfigSchema.optional()
});

export const ProcessPublicationsRequestSchema = z.object({
  operation: z.enum(["process_due", "telegram_acceptance"]).default("process_due"),
  limit: z.number().int().positive().max(100).optional(),
  confirmation: z.string().trim().max(80).optional()
}).superRefine((input, ctx) => {
  if (
    input.operation === "telegram_acceptance" &&
    input.confirmation !== "SEND ONE PRIVATE OWNER TELEGRAM"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmation"],
      message: "Exact Telegram production acceptance confirmation is required"
    });
  }
});

export type PublicationProvider = z.infer<typeof PublicationProviderSchema>;
export type PublicationTargetStatus = z.infer<typeof PublicationTargetStatusSchema>;
export type PublicationPostStatus = z.infer<typeof PublicationPostStatusSchema>;
export type PublicationTargetDeliveryStatus = z.infer<typeof PublicationTargetDeliveryStatusSchema>;
export type PublicationDeliveryStatus = z.infer<typeof PublicationDeliveryStatusSchema>;
export type PublicationEventType = z.infer<typeof PublicationEventTypeSchema>;
export type PublicationTargetSummary = z.infer<typeof PublicationTargetSummarySchema>;
export type PublicationSummary = z.infer<typeof PublicationSummarySchema>;
export type PublicationDetail = z.infer<typeof PublicationDetailSchema>;
export type PublicationProviderHealth = z.infer<typeof PublicationProviderHealthSchema>;
export type CreatePublicationRequest = z.infer<typeof CreatePublicationRequestSchema>;
export type UpdatePublicationRequest = z.infer<typeof UpdatePublicationRequestSchema>;
export type PublicationPublishRequest = z.infer<typeof PublicationPublishRequestSchema>;
export type PublicationScheduleRequest = z.infer<typeof PublicationScheduleRequestSchema>;
export type PublicationRetryRequest = z.infer<typeof PublicationRetryRequestSchema>;
export type CreatePublicationTargetRequest = z.infer<typeof CreatePublicationTargetRequestSchema>;
export type UpdatePublicationTargetRequest = z.infer<typeof UpdatePublicationTargetRequestSchema>;
export type PublicationListResponse = z.infer<typeof PublicationListResponseSchema>;
export type PublicationDetailResponse = z.infer<typeof PublicationDetailResponseSchema>;
export type PublicationTargetsResponse = z.infer<typeof PublicationTargetsResponseSchema>;
export type PublicationTargetResponse = z.infer<typeof PublicationTargetResponseSchema>;
export type PublicationTargetMutationResponse = z.infer<typeof PublicationTargetMutationResponseSchema>;
export type PublicationProviderHealthResponse = z.infer<typeof PublicationProviderHealthResponseSchema>;
export type PublicationActionResponse = z.infer<typeof PublicationActionResponseSchema>;
export type ProcessPublicationsRequest = z.input<typeof ProcessPublicationsRequestSchema>;
export type ProcessPublicationsResponse = z.infer<typeof ProcessPublicationsResponseSchema>;
