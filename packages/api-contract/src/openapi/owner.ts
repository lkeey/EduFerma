import type { JsonSchema } from "./helpers";
import { arrayOf, objectSchema, ref } from "./helpers";

const stringSchema = { type: "string" };
const nullableString = { type: ["string", "null"] };
const booleanSchema = { type: "boolean" };
const dateTimeString = { type: "string", format: "date-time" };
const unknownObject = { type: "object", additionalProperties: true };
const appRoleSchema = {
  type: "string",
  enum: ["owner", "teacher", "tutor", "student", "guardian", "guest"]
};
const manageableRoleSchema = {
  type: "string",
  enum: ["owner", "teacher", "tutor", "student", "guardian"]
};

export const ownerSchemas: Record<string, JsonSchema> = {
  AccessState: {
    type: "string",
    enum: ["missing", "pending", "approved", "rejected", "active", "blocked"]
  },
  AccessRequestStatus: {
    type: "string",
    enum: ["pending", "approved", "rejected"]
  },
  AccessStatusSummary: objectSchema({
    state: ref("AccessState"),
    subjectId: nullableString,
    requestStatus: { anyOf: [ref("AccessRequestStatus"), { type: "null" }] },
    requestedRole: { anyOf: [manageableRoleSchema, { type: "null" }] },
    currentRole: { anyOf: [appRoleSchema, { type: "null" }] },
    reason: nullableString,
    reviewedAt: { anyOf: [dateTimeString, { type: "null" }] },
    lastSeenAt: { anyOf: [dateTimeString, { type: "null" }] }
  }),
  AccessStatusResponse: objectSchema({
    accessStatus: ref("AccessStatusSummary")
  }),
  OwnerAccessRequestRow: objectSchema({
    id: stringSchema,
    subjectId: stringSchema,
    requesterEmail: stringSchema,
    requesterName: nullableString,
    requestedRole: { anyOf: [manageableRoleSchema, { type: "null" }] },
    status: ref("AccessRequestStatus"),
    decisionReason: nullableString,
    reviewedAt: { anyOf: [dateTimeString, { type: "null" }] },
    createdAt: dateTimeString,
    updatedAt: dateTimeString,
    lastSeenAt: dateTimeString,
    linkedUserId: nullableString,
    currentRole: { anyOf: [appRoleSchema, { type: "null" }] },
    blocked: booleanSchema,
    studentId: nullableString,
    studentPublicCode: nullableString,
    learningTrack: nullableString
  }),
  OwnerManagedUser: objectSchema({
    userId: stringSchema,
    clerkSubject: nullableString,
    email: stringSchema,
    displayName: nullableString,
    role: manageableRoleSchema,
    isActive: booleanSchema,
    blockedAt: { anyOf: [dateTimeString, { type: "null" }] },
    blockReason: nullableString,
    studentId: nullableString,
    studentPublicCode: nullableString,
    learningTrack: nullableString,
    createdAt: dateTimeString,
    updatedAt: dateTimeString
  }),
  OwnerAccessAuditEvent: objectSchema({
    id: stringSchema,
    action: stringSchema,
    entityType: stringSchema,
    entityId: nullableString,
    createdAt: dateTimeString,
    actorUserId: nullableString,
    actorEmail: nullableString,
    metadata: unknownObject
  }),
  OwnerAccessOverviewResponse: objectSchema({
    requests: arrayOf(ref("OwnerAccessRequestRow")),
    users: arrayOf(ref("OwnerManagedUser"))
  }),
  OwnerAccessDetailResponse: objectSchema({
    request: ref("OwnerAccessRequestRow"),
    user: { anyOf: [ref("OwnerManagedUser"), { type: "null" }] },
    history: arrayOf(ref("OwnerAccessAuditEvent")),
    accessStatus: ref("AccessStatusSummary"),
    ownerConfirmationPhrase: nullableString
  }),
  OwnerUserAccessDetailResponse: objectSchema({
    user: ref("OwnerManagedUser"),
    history: arrayOf(ref("OwnerAccessAuditEvent")),
    accessStatus: ref("AccessStatusSummary"),
    ownerConfirmationPhrase: nullableString
  }),
  OwnerUserAccessResponse: objectSchema({
    user: ref("OwnerManagedUser"),
    accessStatus: ref("AccessStatusSummary"),
    ownerConfirmationPhrase: nullableString
  }),
  ApproveAccessRequest: objectSchema({
    role: manageableRoleSchema,
    reason: stringSchema,
    ownerConfirmation: stringSchema
  }, ["role", "reason"]),
  RejectAccessRequest: objectSchema({
    reason: stringSchema
  }, ["reason"]),
  UpdateOwnerUserAccessRequest: objectSchema({
    role: manageableRoleSchema,
    isActive: booleanSchema,
    reason: stringSchema,
    ownerConfirmation: stringSchema
  }, ["reason"]),
  CurrentUserResponse: objectSchema({
    user: ref("ServiceUser"),
    accessStatus: ref("AccessStatusSummary")
  }, ["user", "accessStatus"])
};
