import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", ["owner", "teacher", "tutor", "student", "guardian"]);
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);
export const consentStatus = pgEnum("consent_status", ["granted", "pending", "revoked", "not_required"]);
export const taskStatus = pgEnum("task_status", ["active", "draft", "archived", "needs_review"]);
export const assignmentStatus = pgEnum("assignment_status", ["draft", "assigned", "submitted", "reviewed", "archived"]);
export const attemptStatus = pgEnum("attempt_status", ["started", "submitted", "checked", "needs_review"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "converted", "closed"]);

export const accessRequestKind = pgEnum("access_request_kind", ["access", "guardian", "student", "teacher", "tutor", "observer"]);
export const accessRequestStatus = pgEnum("access_request_status", ["pending", "approved", "rejected"]);
export const importJobStatus = pgEnum("import_job_status", [
  "draft",
  "uploaded",
  "analyzing",
  "review_ready",
  "applying",
  "applied",
  "failed",
  "cancelled"
]);
export const importRowStatus = pgEnum("import_row_status", [
  "pending",
  "parsed",
  "needs_review",
  "ready",
  "duplicate",
  "applied",
  "failed",
  "skipped"
]);
export const sourceEvidenceKind = pgEnum("source_evidence_kind", ["document", "screenshot", "url", "note", "archive"]);
export const sourceEvidenceStatus = pgEnum("source_evidence_status", ["pending", "verified", "rejected"]);
export const planStatus = pgEnum("plan_status", ["draft", "active", "superseded", "archived"]);
export const planChangeEventType = pgEnum("plan_change_event_type", [
  "created",
  "updated",
  "review_requested",
  "approved",
  "applied",
  "superseded"
]);
export const planChangeEventStatus = pgEnum("plan_change_event_status", [
  "pending",
  "recorded",
  "approved",
  "rejected",
  "applied"
]);
export const planAdjustmentStatus = pgEnum("plan_adjustment_status", ["proposed", "approved", "rejected", "applied"]);
export const publicationTargetType = pgEnum("publication_target_type", ["telegram", "vk"]);
export const publicationTargetStatus = pgEnum("publication_target_status", ["draft", "active", "paused", "archived"]);
export const socialPostStatus = pgEnum("social_post_status", [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed"
]);
export const socialPostTargetStatus = pgEnum("social_post_target_status", [
  "pending",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled"
]);
export const socialDeliveryStatus = pgEnum("social_delivery_status", ["pending", "scheduled", "sent", "failed", "cancelled"]);
export const publicationEventType = pgEnum("publication_event_type", [
  "created",
  "updated",
  "scheduled",
  "schedule_cancelled",
  "publish_started",
  "published",
  "delivery_failed",
  "retried"
]);

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};
