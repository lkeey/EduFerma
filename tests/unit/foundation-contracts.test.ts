import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  accessRequestStatus,
  accessRequests,
  attempts,
  importJobStatus,
  importJobs,
  importRowStatus,
  importRows,
  planAdjustmentStatus,
  planAdjustments,
  planChangeEventStatus,
  planChangeEvents,
  planStatus,
  publicationEventType,
  publicationEvents,
  publicationTargetStatus,
  publicationTargetType,
  publicationTargets,
  socialDeliveries,
  socialDeliveryStatus,
  socialPostStatus,
  socialPostTargetStatus,
  socialPostTargets,
  socialPosts,
  sourceEvidence,
  sourceEvidenceKind,
  sourceEvidenceStatus
} from "@eduferma/db";

const root = process.cwd();
const drizzleTableName = Symbol.for("drizzle:Name");
const tableName = (table: Record<PropertyKey, unknown>) => table[drizzleTableName];

describe("foundation contracts", () => {
  it("exports new foundation tables through the package root", () => {
    expect(tableName(accessRequests)).toBe("access_requests");
    expect(tableName(importJobs)).toBe("import_jobs");
    expect(tableName(importRows)).toBe("import_rows");
    expect(tableName(sourceEvidence)).toBe("source_evidence");
    expect(tableName(planChangeEvents)).toBe("plan_change_events");
    expect(tableName(planAdjustments)).toBe("plan_adjustments");
    expect(tableName(publicationTargets)).toBe("publication_targets");
    expect(tableName(socialPosts)).toBe("social_posts");
    expect(tableName(socialPostTargets)).toBe("social_post_targets");
    expect(tableName(socialDeliveries)).toBe("social_deliveries");
    expect(tableName(publicationEvents)).toBe("publication_events");
  });

  it("keeps expected enum names stable", () => {
    expect(accessRequestStatus.enumName).toBe("access_request_status");
    expect(importJobStatus.enumName).toBe("import_job_status");
    expect(importRowStatus.enumName).toBe("import_row_status");
    expect(sourceEvidenceKind.enumName).toBe("source_evidence_kind");
    expect(sourceEvidenceStatus.enumName).toBe("source_evidence_status");
    expect(planStatus.enumName).toBe("plan_status");
    expect(planChangeEventStatus.enumName).toBe("plan_change_event_status");
    expect(planAdjustmentStatus.enumName).toBe("plan_adjustment_status");
    expect(publicationTargetType.enumName).toBe("publication_target_type");
    expect(publicationTargetStatus.enumName).toBe("publication_target_status");
    expect(socialPostStatus.enumName).toBe("social_post_status");
    expect(socialPostTargetStatus.enumName).toBe("social_post_target_status");
    expect(socialDeliveryStatus.enumName).toBe("social_delivery_status");
    expect(publicationEventType.enumName).toBe("publication_event_type");
    expect(accessRequestStatus.enumValues).toEqual(["pending", "approved", "rejected"]);
    expect(socialPostStatus.enumValues).toEqual(["draft", "scheduled", "publishing", "published", "failed"]);
  });

  it("adds attempt time_spent_sec without renaming the attempts table", () => {
    expect(tableName(attempts)).toBe("attempts");
    expect(attempts.timeSpentSec.name).toBe("time_spent_sec");
  });

  it("pre-wires feature-owned contract modules", () => {
    for (const feature of ["owner", "imports", "plans", "publications"]) {
      expect(existsSync(join(root, `packages/api-contract/src/registry/${feature}.ts`))).toBe(true);
      expect(existsSync(join(root, `packages/api-contract/src/openapi/${feature}.ts`))).toBe(true);
      expect(existsSync(join(root, `packages/api-client/src/${feature}.ts`))).toBe(true);
      expect(existsSync(join(root, `packages/validators/src/${feature}.ts`))).toBe(true);
    }
  });

  it("has migration sql for all new foundation tables and fields", () => {
    const drizzleDir = join(root, "packages/db/drizzle");
    const sql = readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(join(drizzleDir, file), "utf8"))
      .join("\n");

    expect(existsSync(drizzleDir)).toBe(true);
    expect(sql).toContain('CREATE TABLE "access_requests"');
    expect(sql).toContain('CREATE TABLE "import_jobs"');
    expect(sql).toContain('CREATE TABLE "import_rows"');
    expect(sql).toContain('CREATE TABLE "source_evidence"');
    expect(sql).toContain('CREATE TABLE "plan_change_events"');
    expect(sql).toContain('CREATE TABLE "plan_adjustments"');
    expect(sql).toContain('CREATE TABLE "publication_targets"');
    expect(sql).toContain('CREATE TABLE "social_posts"');
    expect(sql).toContain('CREATE TABLE "social_post_targets"');
    expect(sql).toContain('CREATE TABLE "social_deliveries"');
    expect(sql).toContain('CREATE TABLE "publication_events"');
    expect(sql).toContain('"time_spent_sec" integer DEFAULT 0 NOT NULL');
  });
});
