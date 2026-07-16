import { arrayOf, objectSchema, ref, type JsonSchema } from "./helpers";

const stringSchema = { type: "string" };
const nullableString = { type: ["string", "null"] };
const integerSchema = { type: "integer" };
const booleanSchema = { type: "boolean" };
const unknownSchema = {};
const unknownObject = { type: "object", additionalProperties: true };

export const importSchemas: Record<string, JsonSchema> = {
  ImportWarning: objectSchema({
    code: stringSchema,
    message: stringSchema,
    rowNo: integerSchema
  }, ["code", "message"], true),
  SourceEvidence: objectSchema({
    id: stringSchema,
    kind: { type: "string", enum: ["document", "screenshot", "url", "note", "archive"] },
    status: { type: "string", enum: ["pending", "verified", "rejected"] },
    label: stringSchema,
    url: nullableString,
    byteSize: { type: ["integer", "null"] },
    contentType: nullableString,
    licenseStatus: stringSchema,
    parserVersion: nullableString,
    importedAt: nullableString,
    capturedAt: nullableString,
    checksum: nullableString
  }, ["id", "kind", "status", "label", "licenseStatus"]),
  ImportRowTask: objectSchema({
    task_id: stringSchema,
    learning_track: stringSchema,
    exam: nullableString,
    task_number: nullableString,
    topic: nullableString,
    prototype_id: nullableString,
    skill_atoms: arrayOf(stringSchema),
    difficulty_level: stringSchema,
    source_id: stringSchema,
    source_name: stringSchema,
    source_url: nullableString,
    source_task_id: nullableString,
    statement_md: stringSchema,
    answer: unknownSchema,
    answer_json: unknownSchema,
    solution_md: nullableString,
    verification_status: stringSchema,
    license_status: stringSchema,
    status: stringSchema,
    created_at: stringSchema,
    updated_at: stringSchema,
    canonical_hash: stringSchema,
    metadata: unknownObject
  }, [
    "task_id",
    "learning_track",
    "skill_atoms",
    "difficulty_level",
    "source_id",
    "source_name",
    "statement_md",
    "verification_status",
    "license_status",
    "status",
    "created_at",
    "updated_at"
  ], true),
  ImportRow: objectSchema({
    id: stringSchema,
    rowNo: integerSchema,
    sourceRowId: nullableString,
    sourceTaskId: nullableString,
    status: { type: "string", enum: ["pending", "parsed", "needs_review", "ready", "duplicate", "applied", "failed", "skipped"] },
    errorCode: nullableString,
    errorMessage: nullableString,
    payload: unknownObject,
    normalizedTask: { anyOf: [ref("ImportRowTask"), { type: "null" }] },
    evidence: arrayOf(ref("SourceEvidence")),
    appliedAt: nullableString,
    createdAt: stringSchema,
    updatedAt: stringSchema
  }, ["id", "rowNo", "status", "payload", "evidence", "createdAt", "updatedAt"]),
  ImportJob: objectSchema({
    id: stringSchema,
    status: { type: "string", enum: ["draft", "uploaded", "analyzing", "review_ready", "applying", "applied", "failed", "cancelled"] },
    dryRun: booleanSchema,
    sourceType: nullableString,
    sourceUrl: nullableString,
    sourceName: nullableString,
    originalFilename: nullableString,
    byteSize: { type: ["integer", "null"] },
    contentType: nullableString,
    sha256: nullableString,
    licenseStatus: stringSchema,
    parserVersion: nullableString,
    summary: unknownObject,
    warnings: arrayOf(ref("ImportWarning")),
    createdAt: stringSchema,
    updatedAt: stringSchema,
    analyzedAt: nullableString,
    appliedAt: nullableString
  }, ["id", "status", "dryRun", "licenseStatus", "summary", "warnings", "createdAt", "updatedAt"]),
  ImportJobResponse: objectSchema({
    job: ref("ImportJob")
  }),
  ImportJobsResponse: objectSchema({
    jobs: arrayOf(ref("ImportJob")),
    total: integerSchema
  }, ["jobs", "total"]),
  ImportRowResponse: objectSchema({
    row: ref("ImportRow")
  }),
  ImportRowsResponse: objectSchema({
    rows: arrayOf(ref("ImportRow")),
    total: integerSchema
  }, ["rows", "total"]),
  CreateImportJobRequest: objectSchema({
    sourceType: { type: "string", enum: ["upload", "url"] },
    sourceUrl: stringSchema,
    sourceName: stringSchema,
    dryRun: booleanSchema,
    licenseStatus: stringSchema
  }, [], true),
  ImportUploadRequest: objectSchema({
    file: {
      type: "string",
      format: "binary"
    }
  }, ["file"]),
  AnalyzeImportJobRequest: objectSchema({
    parserVersion: stringSchema,
    licenseStatus: stringSchema
  }, [], true),
  UpdateImportRowRequest: objectSchema({
    status: stringSchema,
    errorCode: nullableString,
    errorMessage: nullableString,
    normalizedTask: unknownObject
  }, [], true),
  ApplyImportJobRequest: objectSchema({
    taskIds: arrayOf(stringSchema),
    force: booleanSchema
  }, [], true),
  TeacherTaskPatchRequest: objectSchema({
    topic: stringSchema,
    taskNumber: stringSchema,
    difficultyLevel: stringSchema,
    statementMd: stringSchema,
    answerJson: unknownSchema,
    solutionMd: nullableString,
    verificationStatus: stringSchema,
    licenseStatus: stringSchema,
    status: stringSchema,
    skillAtoms: arrayOf(stringSchema),
    sourceName: stringSchema,
    sourceUrl: nullableString,
    sourceTaskId: nullableString
  }, [], true),
  DeleteTaskRequest: objectSchema({
    mode: { type: "string", enum: ["delete", "archive"] }
  }, [], true),
  BulkTaskRequest: objectSchema({
    action: { type: "string", enum: ["archive", "delete", "activate", "mark_needs_review"] },
    taskIds: arrayOf(stringSchema),
    patch: unknownObject
  }, ["action", "taskIds"], true),
  TeacherTaskMutationResponse: objectSchema({
    task: ref("TeacherTask")
  }),
  TeacherTaskBankResponse: objectSchema({
    tasks: arrayOf(ref("TeacherTask")),
    page: integerSchema,
    pageSize: integerSchema,
    total: integerSchema,
    totalPages: integerSchema,
    sortBy: stringSchema,
    sortOrder: stringSchema
  }, ["tasks", "page", "pageSize", "total", "totalPages", "sortBy", "sortOrder"]),
  TeacherTaskBulkResponse: objectSchema({
    updated: integerSchema,
    archived: integerSchema,
    deleted: integerSchema,
    tasks: arrayOf(ref("TeacherTask"))
  }, ["updated", "archived", "deleted", "tasks"])
};
