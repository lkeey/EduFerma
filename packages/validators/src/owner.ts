import { z } from "zod";

const AppRoleSchema = z.enum(["owner", "teacher", "tutor", "student", "guardian", "guest"]);
const ManageableRoleSchema = AppRoleSchema.exclude(["guest"]);

export const AccessRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const AccessStateSchema = z.enum(["missing", "pending", "approved", "rejected", "active", "blocked"]);

export const OwnerAccessListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: AccessRequestStatusSchema.optional(),
  role: ManageableRoleSchema.optional(),
  active: z.enum(["all", "active", "blocked"]).optional()
});

export const AccessStatusSummarySchema = z.object({
  state: AccessStateSchema,
  subjectId: z.string().nullable(),
  requestStatus: AccessRequestStatusSchema.nullable(),
  requestedRole: ManageableRoleSchema.nullable(),
  currentRole: AppRoleSchema.nullable(),
  reason: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  lastSeenAt: z.string().nullable()
});

export const OwnerAccessRequestRowSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  requesterEmail: z.string().min(1),
  requesterName: z.string().nullable(),
  requestedRole: ManageableRoleSchema.nullable(),
  status: AccessRequestStatusSchema,
  decisionReason: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastSeenAt: z.string(),
  linkedUserId: z.string().nullable(),
  currentRole: AppRoleSchema.nullable(),
  blocked: z.boolean(),
  studentId: z.string().nullable(),
  studentPublicCode: z.string().nullable(),
  learningTrack: z.string().nullable()
});

export const OwnerManagedUserSchema = z.object({
  userId: z.string().min(1),
  clerkSubject: z.string().nullable(),
  email: z.string().min(1),
  displayName: z.string().nullable(),
  role: ManageableRoleSchema,
  isActive: z.boolean(),
  blockedAt: z.string().nullable(),
  blockReason: z.string().nullable(),
  studentId: z.string().nullable(),
  studentPublicCode: z.string().nullable(),
  learningTrack: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const OwnerAccessAuditEventSchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().nullable(),
  createdAt: z.string(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  metadata: z.record(z.unknown())
});

export const AccessStatusResponseSchema = z.object({
  accessStatus: AccessStatusSummarySchema
});

export const OwnerAccessOverviewResponseSchema = z.object({
  requests: z.array(OwnerAccessRequestRowSchema),
  users: z.array(OwnerManagedUserSchema)
});

export const OwnerAccessDetailResponseSchema = z.object({
  request: OwnerAccessRequestRowSchema,
  user: OwnerManagedUserSchema.nullable(),
  history: z.array(OwnerAccessAuditEventSchema),
  accessStatus: AccessStatusSummarySchema,
  ownerConfirmationPhrase: z.string().nullable()
});

export const OwnerUserAccessDetailResponseSchema = z.object({
  user: OwnerManagedUserSchema,
  history: z.array(OwnerAccessAuditEventSchema),
  accessStatus: AccessStatusSummarySchema,
  ownerConfirmationPhrase: z.string().nullable()
});

export const OwnerUserAccessResponseSchema = z.object({
  user: OwnerManagedUserSchema,
  accessStatus: AccessStatusSummarySchema,
  ownerConfirmationPhrase: z.string().nullable()
});

export const ApproveAccessRequestSchema = z.object({
  role: ManageableRoleSchema,
  reason: z.string().trim().min(1),
  ownerConfirmation: z.string().trim().min(1).optional()
});

export const RejectAccessRequestSchema = z.object({
  reason: z.string().trim().min(1)
});

export const UpdateOwnerUserAccessRequestSchema = z
  .object({
    role: ManageableRoleSchema.optional(),
    isActive: z.boolean().optional(),
    reason: z.string().trim().min(1),
    ownerConfirmation: z.string().trim().min(1).optional()
  })
  .refine((value) => typeof value.role !== "undefined" || typeof value.isActive !== "undefined", {
    message: "At least one access change is required",
    path: ["role"]
  });

export type AccessRequestStatus = z.infer<typeof AccessRequestStatusSchema>;
export type AccessState = z.infer<typeof AccessStateSchema>;
export type OwnerAccessListQuery = z.infer<typeof OwnerAccessListQuerySchema>;
export type AccessStatusSummary = z.infer<typeof AccessStatusSummarySchema>;
export type OwnerAccessRequestRow = z.infer<typeof OwnerAccessRequestRowSchema>;
export type OwnerManagedUser = z.infer<typeof OwnerManagedUserSchema>;
export type OwnerAccessAuditEvent = z.infer<typeof OwnerAccessAuditEventSchema>;
export type AccessStatusResponse = z.infer<typeof AccessStatusResponseSchema>;
export type OwnerAccessOverviewResponse = z.infer<typeof OwnerAccessOverviewResponseSchema>;
export type OwnerAccessDetailResponse = z.infer<typeof OwnerAccessDetailResponseSchema>;
export type OwnerUserAccessDetailResponse = z.infer<typeof OwnerUserAccessDetailResponseSchema>;
export type OwnerUserAccessResponse = z.infer<typeof OwnerUserAccessResponseSchema>;
export type ApproveAccessRequest = z.infer<typeof ApproveAccessRequestSchema>;
export type RejectAccessRequest = z.infer<typeof RejectAccessRequestSchema>;
export type UpdateOwnerUserAccessRequest = z.infer<typeof UpdateOwnerUserAccessRequestSchema>;
