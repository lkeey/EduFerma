import { z } from "zod";
import {
  DifficultySchema,
  LicenseStatusSchema,
  PlatformTaskSchema,
  TaskStatusSchema,
  VerificationStatusSchema
} from "./task";

const NullableString = z.string().trim().min(1).nullable().optional();
const isoDateString = z.string().datetime().or(z.string().min(1));

export const ImportSourceTypeSchema = z.enum(["upload", "url"]);
export const ImportJobStatusSchema = z.enum([
  "draft",
  "uploaded",
  "analyzing",
  "review_ready",
  "applying",
  "applied",
  "failed",
  "cancelled"
]);
export const ImportRowStatusSchema = z.enum([
  "pending",
  "parsed",
  "needs_review",
  "ready",
  "duplicate",
  "applied",
  "failed",
  "skipped"
]);
export const SourceEvidenceKindSchema = z.enum(["document", "screenshot", "url", "note", "archive"]);
export const SourceEvidenceStatusSchema = z.enum(["pending", "verified", "rejected"]);
export const ImportSortFieldSchema = z.enum(["createdAt", "updatedAt", "status", "sourceName"]);
export const SortOrderSchema = z.enum(["asc", "desc"]);
export const TaskBankSortFieldSchema = z.enum([
  "updatedAt",
  "createdAt",
  "taskNumber",
  "difficultyLevel",
  "sourceName",
  "status"
]);
export const DeleteTaskModeSchema = z.enum(["delete", "archive"]);
export const BulkTaskActionSchema = z.enum(["archive", "delete", "activate", "mark_needs_review"]);

export const TeacherTaskBankQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  learningTrack: z.string().trim().optional(),
  exam: z.string().trim().optional(),
  taskNumber: z.string().trim().optional(),
  difficultyLevel: DifficultySchema.optional(),
  status: TaskStatusSchema.optional(),
  sortBy: TaskBankSortFieldSchema.default("updatedAt"),
  sortOrder: SortOrderSchema.default("desc")
});

export const SourceEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: SourceEvidenceKindSchema,
  status: SourceEvidenceStatusSchema,
  label: z.string().min(1),
  url: NullableString,
  byteSize: z.number().int().nonnegative().nullable().optional(),
  contentType: NullableString,
  licenseStatus: LicenseStatusSchema,
  parserVersion: NullableString,
  importedAt: NullableString,
  capturedAt: NullableString,
  checksum: NullableString
});

export const ImportWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  rowNo: z.number().int().positive().optional()
});

export const ImportJobSummarySchema = z.object({
  id: z.string().min(1),
  status: ImportJobStatusSchema,
  dryRun: z.boolean(),
  sourceType: NullableString,
  sourceUrl: NullableString,
  sourceName: NullableString,
  originalFilename: NullableString,
  byteSize: z.number().int().nonnegative().nullable().optional(),
  contentType: NullableString,
  sha256: NullableString,
  licenseStatus: LicenseStatusSchema,
  parserVersion: NullableString,
  summary: z.record(z.string(), z.unknown()).default({}),
  warnings: z.array(ImportWarningSchema).default([]),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  analyzedAt: NullableString,
  appliedAt: NullableString
});

export const ImportEvidenceSummarySchema = z.object({
  kind: SourceEvidenceKindSchema,
  label: z.string().min(1),
  url: NullableString,
  checksum: NullableString,
  byteSize: z.number().int().nonnegative().nullable().optional(),
  contentType: NullableString
});

export const ImportRowTaskSchema = PlatformTaskSchema.pick({
  task_id: true,
  learning_track: true,
  exam: true,
  task_number: true,
  topic: true,
  prototype_id: true,
  skill_atoms: true,
  difficulty_level: true,
  source_id: true,
  source_name: true,
  source_url: true,
  source_task_id: true,
  statement_md: true,
  answer: true,
  solution_md: true,
  verification_status: true,
  license_status: true,
  status: true,
  created_at: true,
  updated_at: true
}).extend({
  canonical_hash: z.string().min(1).optional(),
  answer_json: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ImportRowSchema = z.object({
  id: z.string().min(1),
  rowNo: z.number().int().positive(),
  sourceRowId: NullableString,
  sourceTaskId: NullableString,
  status: ImportRowStatusSchema,
  errorCode: NullableString,
  errorMessage: NullableString,
  payload: z.record(z.string(), z.unknown()).default({}),
  normalizedTask: ImportRowTaskSchema.nullable().optional(),
  evidence: z.array(SourceEvidenceSchema).default([]),
  appliedAt: NullableString,
  createdAt: isoDateString,
  updatedAt: isoDateString
});

export const ImportRowsResponseSchema = z.object({
  rows: z.array(ImportRowSchema),
  total: z.number().int().nonnegative()
});

export const ImportJobResponseSchema = z.object({
  job: ImportJobSummarySchema
});

export const ImportJobsResponseSchema = z.object({
  jobs: z.array(ImportJobSummarySchema),
  total: z.number().int().nonnegative()
});

export const CreateImportJobRequestSchema = z.object({
  sourceType: ImportSourceTypeSchema.default("upload"),
  sourceUrl: z.string().url().optional(),
  sourceName: z.string().trim().min(1).optional(),
  dryRun: z.boolean().default(true),
  licenseStatus: LicenseStatusSchema.default("unknown")
}).superRefine((value, ctx) => {
  if (value.sourceType === "url" && !value.sourceUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "sourceUrl is required for url imports", path: ["sourceUrl"] });
  }
});

export const AnalyzeImportJobRequestSchema = z.object({
  parserVersion: z.string().trim().min(1).optional(),
  licenseStatus: LicenseStatusSchema.optional()
}).default({});

export const UpdateImportRowRequestSchema = z.object({
  status: ImportRowStatusSchema.optional(),
  errorCode: z.string().trim().min(1).nullable().optional(),
  errorMessage: z.string().trim().min(1).nullable().optional(),
  normalizedTask: ImportRowTaskSchema.partial().optional()
});

export const ApplyImportJobRequestSchema = z.object({
  taskIds: z.array(z.string().min(1)).optional(),
  force: z.boolean().default(false)
}).default({});

export const TeacherTaskPatchRequestSchema = z.object({
  topic: z.string().trim().min(1).optional(),
  taskNumber: z.string().trim().min(1).optional(),
  difficultyLevel: DifficultySchema.optional(),
  statementMd: z.string().trim().min(8).optional(),
  answerJson: z.unknown().optional(),
  solutionMd: z.string().trim().min(1).nullable().optional(),
  verificationStatus: VerificationStatusSchema.optional(),
  licenseStatus: LicenseStatusSchema.optional(),
  status: TaskStatusSchema.optional(),
  skillAtoms: z.array(z.string().trim().min(1)).optional(),
  sourceName: z.string().trim().min(1).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  sourceTaskId: z.string().trim().min(1).nullable().optional()
});

export const DeleteTaskRequestSchema = z.object({
  mode: DeleteTaskModeSchema.default("delete")
}).default({});

export const BulkTaskRequestSchema = z.object({
  action: BulkTaskActionSchema,
  taskIds: z.array(z.string().min(1)).min(1),
  patch: TeacherTaskPatchRequestSchema.optional()
});

export const TeacherTaskBankResponseSchema = z.object({
  tasks: z.array(z.record(z.string(), z.unknown())),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  sortBy: TaskBankSortFieldSchema,
  sortOrder: SortOrderSchema
});

export const TeacherTaskMutationResponseSchema = z.object({
  task: z.record(z.string(), z.unknown())
});

export const TeacherTaskBulkResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
  archived: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  tasks: z.array(z.record(z.string(), z.unknown()))
});

export type TeacherTaskBankQuery = z.infer<typeof TeacherTaskBankQuerySchema>;
export type ImportJobSummary = z.infer<typeof ImportJobSummarySchema>;
export type ImportRow = z.infer<typeof ImportRowSchema>;
export type CreateImportJobRequest = z.infer<typeof CreateImportJobRequestSchema>;
export type AnalyzeImportJobRequest = z.infer<typeof AnalyzeImportJobRequestSchema>;
export type UpdateImportRowRequest = z.infer<typeof UpdateImportRowRequestSchema>;
export type ApplyImportJobRequest = z.infer<typeof ApplyImportJobRequestSchema>;
export type TeacherTaskPatchRequest = z.infer<typeof TeacherTaskPatchRequestSchema>;
export type DeleteTaskRequest = z.infer<typeof DeleteTaskRequestSchema>;
export type BulkTaskRequest = z.infer<typeof BulkTaskRequestSchema>;
