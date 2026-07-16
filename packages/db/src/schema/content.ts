import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { importJobStatus, importRowStatus, sourceEvidenceKind, sourceEvidenceStatus, taskStatus, timestamps } from "./shared";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: text("task_id").notNull(),
    canonicalHash: text("canonical_hash"),
    learningTrack: text("learning_track").notNull(),
    exam: text("exam"),
    examYear: integer("exam_year"),
    subject: text("subject").notNull().default("informatics"),
    taskNumber: text("task_number"),
    topic: text("topic"),
    subtopic: text("subtopic"),
    prototypeId: text("prototype_id"),
    skillAtoms: jsonb("skill_atoms").$type<string[]>().notNull().default([]),
    difficultyLevel: text("difficulty_level").notNull().default("unknown"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    sourceTaskId: text("source_task_id"),
    statementMd: text("statement_md").notNull(),
    answerJson: jsonb("answer_json").$type<Record<string, unknown>>(),
    answerHash: text("answer_hash"),
    solutionMd: text("solution_md"),
    verificationStatus: text("verification_status").notNull().default("unknown"),
    licenseStatus: text("license_status").notNull().default("unknown"),
    status: taskStatus("status").notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    taskIdIdx: uniqueIndex("tasks_task_id_idx").on(table.taskId),
    prototypeIdx: index("tasks_prototype_idx").on(table.learningTrack, table.prototypeId),
    statusIdx: index("tasks_status_idx").on(table.status),
    canonicalHashIdx: index("tasks_canonical_hash_idx").on(table.canonicalHash),
    sourceLookupIdx: index("tasks_source_lookup_idx").on(table.sourceName, table.sourceTaskId),
    trackExamNumberIdx: index("tasks_track_exam_number_idx").on(table.learningTrack, table.exam, table.taskNumber)
  })
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: text("source_id").notNull(),
    name: text("name").notNull(),
    url: text("url"),
    licenseStatus: text("license_status").notNull().default("unknown"),
    ...timestamps
  },
  (table) => ({
    sourceIdIdx: uniqueIndex("sources_source_id_idx").on(table.sourceId),
    licenseIdx: index("sources_license_idx").on(table.licenseStatus)
  })
);

export const prototypes = pgTable(
  "prototypes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prototypeId: text("prototype_id").notNull(),
    title: text("title").notNull(),
    taskNumber: text("task_number"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    prototypeIdIdx: uniqueIndex("prototypes_prototype_id_idx").on(table.prototypeId)
  })
);

export const skillAtoms = pgTable(
  "skill_atoms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillAtom: text("skill_atom").notNull(),
    title: text("title").notNull(),
    topic: text("topic"),
    ...timestamps
  },
  (table) => ({
    skillAtomIdx: uniqueIndex("skill_atoms_skill_atom_idx").on(table.skillAtom)
  })
);

export const taskSkillAtoms = pgTable(
  "task_skill_atoms",
  {
    taskId: uuid("task_id").notNull().references(() => tasks.id),
    skillAtomId: uuid("skill_atom_id").notNull().references(() => skillAtoms.id),
    ...timestamps
  },
  (table) => ({
    taskSkillIdx: uniqueIndex("task_skill_atoms_idx").on(table.taskId, table.skillAtomId)
  })
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").references(() => sources.id),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    importKind: text("import_kind").notNull().default("task_bank_sync"),
    status: importJobStatus("status").notNull().default("draft"),
    dryRun: boolean("dry_run").notNull().default(true),
    sourceType: text("source_type"),
    sourceUrl: text("source_url"),
    originalFilename: text("original_filename"),
    storageKey: text("storage_key"),
    inputFilePath: text("input_file_path"),
    inputChecksum: text("input_checksum"),
    sha256: text("sha256"),
    byteSize: integer("byte_size"),
    contentType: text("content_type"),
    licenseStatus: text("license_status").notNull().default("unknown"),
    parserVersion: text("parser_version"),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    sourceStatusIdx: index("import_jobs_source_status_idx").on(table.sourceId, table.status),
    statusCreatedIdx: index("import_jobs_status_created_idx").on(table.status, table.createdAt)
  })
);

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull().references(() => importJobs.id),
    sourceId: uuid("source_id").references(() => sources.id),
    taskId: uuid("task_id").references(() => tasks.id),
    rowNo: integer("row_no").notNull(),
    sourceRowId: text("source_row_id"),
    sourceTaskId: text("source_task_id"),
    status: importRowStatus("status").notNull().default("pending"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    normalizedTask: jsonb("normalized_task").$type<Record<string, unknown>>().notNull().default({}),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    jobRowIdx: uniqueIndex("import_rows_job_row_idx").on(table.jobId, table.rowNo),
    statusIdx: index("import_rows_status_idx").on(table.status),
    sourceTaskIdx: index("import_rows_source_task_idx").on(table.sourceId, table.sourceTaskId)
  })
);

export const sourceEvidence = pgTable(
  "source_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").references(() => sources.id),
    importRowId: uuid("import_row_id").references(() => importRows.id),
    taskId: uuid("task_id").references(() => tasks.id),
    kind: sourceEvidenceKind("kind").notNull(),
    status: sourceEvidenceStatus("status").notNull().default("pending"),
    label: text("label").notNull(),
    url: text("url"),
    storagePath: text("storage_path"),
    storageKey: text("storage_key"),
    checksum: text("checksum"),
    byteSize: integer("byte_size"),
    contentType: text("content_type"),
    licenseStatus: text("license_status").notNull().default("unknown"),
    parserVersion: text("parser_version"),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    sourceKindIdx: index("source_evidence_source_kind_idx").on(table.sourceId, table.kind),
    rowIdx: index("source_evidence_row_idx").on(table.importRowId),
    taskStatusIdx: index("source_evidence_task_status_idx").on(table.taskId, table.status)
  })
);
