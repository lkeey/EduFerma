import { arrayOf, type JsonSchema, objectSchema, ref } from "./helpers";

const stringSchema = { type: "string" };
const nullableString = { type: ["string", "null"] };
const dateTimeString = { type: "string", format: "date-time" };
const nullableDateTime = { type: ["string", "null"], format: "date-time" };
const integerSchema = { type: "integer" };
const booleanSchema = { type: "boolean" };
const unknownObject = { type: "object", additionalProperties: true };

export const publicationSchemas: Record<string, JsonSchema> = {
  PublicationTargetSummary: objectSchema({
    id: stringSchema,
    slug: stringSchema,
    title: stringSchema,
    provider: { type: "string", enum: ["telegram", "vk"] },
    status: { type: "string", enum: ["draft", "active", "paused", "archived"] },
    config: unknownObject,
    lastPublishedAt: nullableDateTime,
    recipientMode: { type: "string", enum: ["static", "subscriber-opt-in"] },
    recipientCount: integerSchema,
    isEditableByOwner: booleanSchema,
    healthStatus: { type: "string", enum: ["ok", "error", "setup_required"] },
    healthMessage: stringSchema,
    createdAt: dateTimeString,
    updatedAt: dateTimeString
  }),
  PublicationTargetReference: objectSchema({
    id: stringSchema,
    title: stringSchema,
    provider: { type: "string", enum: ["telegram", "vk"] },
    status: { type: "string", enum: ["pending", "scheduled", "publishing", "published", "failed", "cancelled"] },
    scheduledFor: nullableDateTime,
    publishedAt: nullableDateTime,
    revision: integerSchema,
    deliveryCount: integerSchema,
    latestDeliveryStatus: { type: ["string", "null"], enum: ["pending", "scheduled", "sent", "failed", "cancelled", null] }
  }),
  PublicationDeliveryRecord: objectSchema({
    id: stringSchema,
    provider: { type: "string", enum: ["telegram", "vk"] },
    status: { type: "string", enum: ["pending", "scheduled", "sent", "failed", "cancelled"] },
    attemptNo: integerSchema,
    idempotencyKey: stringSchema,
    providerMessageId: nullableString,
    claimedAt: nullableDateTime,
    claimedBy: nullableString,
    deliveredAt: nullableDateTime,
    nextAttemptAt: nullableDateTime,
    errorCode: nullableString,
    errorMessage: nullableString,
    createdAt: dateTimeString,
    updatedAt: dateTimeString
  }),
  PublicationEventRecord: objectSchema({
    id: stringSchema,
    eventType: {
      type: "string",
      enum: ["created", "updated", "scheduled", "schedule_cancelled", "publish_started", "published", "delivery_failed", "retried"]
    },
    createdAt: dateTimeString,
    actorUserId: nullableString,
    payload: unknownObject
  }),
  PublicationSummary: objectSchema({
    id: stringSchema,
    duplicateOfPostId: nullableString,
    revision: integerSchema,
    title: stringSchema,
    excerpt: nullableString,
    bodyMd: stringSchema,
    audience: nullableString,
    contentHash: nullableString,
    status: { type: "string", enum: ["draft", "scheduled", "publishing", "published", "failed"] },
    scheduledFor: nullableDateTime,
    publishedAt: nullableDateTime,
    publishAllowed: booleanSchema,
    createdAt: dateTimeString,
    updatedAt: dateTimeString,
    targets: arrayOf(ref("PublicationTargetReference"))
  }),
  PublicationDetail: objectSchema({
    id: stringSchema,
    duplicateOfPostId: nullableString,
    revision: integerSchema,
    title: stringSchema,
    excerpt: nullableString,
    bodyMd: stringSchema,
    audience: nullableString,
    contentHash: nullableString,
    status: { type: "string", enum: ["draft", "scheduled", "publishing", "published", "failed"] },
    scheduledFor: nullableDateTime,
    publishedAt: nullableDateTime,
    publishAllowed: booleanSchema,
    createdAt: dateTimeString,
    updatedAt: dateTimeString,
    targets: arrayOf(ref("PublicationTargetReference")),
    metadata: unknownObject,
    deliveries: arrayOf(ref("PublicationDeliveryRecord")),
    history: arrayOf(ref("PublicationEventRecord"))
  }),
  PublicationProviderHealth: objectSchema({
    provider: { type: "string", enum: ["telegram", "vk"] },
    status: { type: "string", enum: ["ok", "error", "setup_required"] },
    message: stringSchema,
    checkedAt: dateTimeString
  }),
  PublicationListResponse: objectSchema({
    posts: arrayOf(ref("PublicationSummary"))
  }),
  PublicationDetailResponse: objectSchema({
    publication: ref("PublicationDetail")
  }),
  PublicationTargetsResponse: objectSchema({
    targets: arrayOf(ref("PublicationTargetSummary")),
    health: arrayOf(ref("PublicationProviderHealth"))
  }),
  PublicationProviderHealthResponse: objectSchema({
    health: arrayOf(ref("PublicationProviderHealth"))
  }),
  PublicationActionResponse: objectSchema({
    publication: ref("PublicationDetail"),
    action: {
      type: "string",
      enum: ["created", "updated", "published", "scheduled", "cancelled", "retried", "processed"]
    }
  }),
  PublicationTargetMutationResponse: objectSchema({
    target: ref("PublicationTargetSummary"),
    action: { type: "string", enum: ["created", "updated", "archived"] }
  }),
  ProcessPublicationsResponse: objectSchema({
    ok: booleanSchema,
    claimedCount: integerSchema,
    sentCount: integerSchema,
    failedCount: integerSchema,
    skippedCount: integerSchema,
    processedAt: dateTimeString,
    acceptance: objectSchema({
      mode: { type: "string", enum: ["sent-and-verified", "already-sent"] },
      postId: stringSchema,
      sentDeliveryCount: { type: "integer", enum: [1] },
      providerMessageId: stringSchema
    })
  }, ["ok", "claimedCount", "sentCount", "failedCount", "skippedCount", "processedAt"]),
  CreatePublicationRequest: objectSchema({
    title: stringSchema,
    excerpt: nullableString,
    bodyMd: stringSchema,
    audience: nullableString,
    publishAllowed: booleanSchema,
    targetIds: arrayOf(stringSchema),
    scheduledFor: nullableDateTime,
    metadata: unknownObject
  }, ["title", "bodyMd"]),
  UpdatePublicationRequest: objectSchema({
    title: stringSchema,
    excerpt: nullableString,
    bodyMd: stringSchema,
    audience: nullableString,
    publishAllowed: booleanSchema,
    targetIds: arrayOf(stringSchema),
    scheduledFor: nullableDateTime,
    metadata: unknownObject
  }, []),
  PublicationPublishRequest: objectSchema({
    targetIds: arrayOf(stringSchema)
  }, []),
  PublicationScheduleRequest: objectSchema({
    scheduledFor: dateTimeString,
    targetIds: arrayOf(stringSchema)
  }, ["scheduledFor"]),
  PublicationRetryRequest: objectSchema({
    scheduledFor: nullableDateTime,
    targetIds: arrayOf(stringSchema)
  }, []),
  CreatePublicationTargetRequest: objectSchema({
    slug: stringSchema,
    title: stringSchema,
    provider: { type: "string", enum: ["telegram", "vk"] },
    status: { type: "string", enum: ["draft", "active", "paused", "archived"] },
    config: unknownObject
  }, ["slug", "title", "provider"]),
  UpdatePublicationTargetRequest: objectSchema({
    title: stringSchema,
    status: { type: "string", enum: ["draft", "active", "paused", "archived"] },
    config: unknownObject
  }, []),
  ProcessPublicationsRequest: objectSchema({
    operation: { type: "string", enum: ["process_due", "telegram_acceptance"], default: "process_due" },
    limit: integerSchema,
    confirmation: stringSchema
  }, [])
};
