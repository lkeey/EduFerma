import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { basename, extname } from "node:path";
import { inflateRawSync } from "node:zlib";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql
} from "drizzle-orm";
import {
  assignmentTasks,
  attempts,
  importJobs,
  importRows,
  learningPlans,
  sourceEvidence,
  sources,
  taskSkillAtoms,
  tasks,
  type getDb
} from "@eduferma/db";
import type { RawTask, ServiceContext } from "@eduferma/core/services";
import { ApiError } from "@/server/api/responses";
import { getPrivateImportBlob, putPrivateImportBlob } from "./blob-storage";

const PARSER_VERSION = "task-import-v1";
const DEFAULT_IMPORT_LIMIT = 50;
const DEFAULT_TASK_PAGE_SIZE = 20;
const MAX_TASK_PAGE_SIZE = 100;
const MAX_REMOTE_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMPORT_ROWS = 2_000;
const MAX_EXTRACTED_TEXT_BYTES = 10 * 1024 * 1024;
const MAX_REMOTE_REDIRECTS = 3;
const MAX_REMOTE_REQUESTS_PER_HOST_PER_MINUTE = 5;
const REMOTE_TIMEOUT_MS = 8_000;
const ALLOWLIST_ENV_KEYS = ["TASK_IMPORT_ALLOWLIST_DOMAINS", "TASK_IMPORT_ALLOWED_DOMAINS"];

const knownSourceLabels: Record<string, string> = {
  "kompege.ru": "Kompege",
  "kpolyakov.spb.ru": "KPolyakov",
  "3.shkolkovo.online": "Shkolkovo",
  "fipi.ru": "FIPI"
};

const knownAllowedDomains = Object.keys(knownSourceLabels);
const requestWindow = new Map<string, { startedAt: number; count: number }>();

type Db = ReturnType<typeof getDb>;
type DbTask = typeof tasks.$inferSelect;
type DbImportJob = typeof importJobs.$inferSelect;
type DbImportRow = typeof importRows.$inferSelect;
type DbSourceEvidence = typeof sourceEvidence.$inferSelect;

type TaskBankQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  learningTrack?: string;
  exam?: string;
  taskNumber?: string;
  topic?: string;
  prototypeId?: string;
  difficultyLevel?: string;
  sourceName?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

type CreateImportJobInput = {
  sourceType?: "upload" | "url";
  sourceUrl?: string;
  sourceName?: string;
  dryRun?: boolean;
  licenseStatus?: string;
};

type AnalyzeImportJobInput = {
  parserVersion?: string;
  licenseStatus?: string;
};

type UpdateImportRowInput = {
  status?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  normalizedTask?: Record<string, unknown>;
};

type ApplyImportJobInput = {
  taskIds?: string[];
  force?: boolean;
};

type TeacherTaskPatchInput = {
  topic?: string;
  taskNumber?: string;
  difficultyLevel?: string;
  statementMd?: string;
  answerJson?: unknown;
  solutionMd?: string | null;
  verificationStatus?: string;
  licenseStatus?: string;
  status?: string;
  skillAtoms?: string[];
  sourceName?: string;
  sourceUrl?: string | null;
  sourceTaskId?: string | null;
};

type BulkTaskInput = {
  action: "archive" | "delete" | "activate" | "mark_needs_review";
  taskIds: string[];
  patch?: TeacherTaskPatchInput;
};

type ParsedTaskRow = {
  rowNo: number;
  sourceRowId?: string;
  sourceTaskId?: string;
  status: "ready" | "needs_review" | "duplicate" | "failed";
  payload: Record<string, unknown>;
  normalizedTask?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  evidence: Array<{
    kind: "document" | "url" | "note";
    label: string;
    url?: string;
    checksum?: string;
    byteSize?: number;
    contentType?: string;
    storageKey?: string;
  }>;
};

type ParsedImportPayload = {
  sourceName: string;
  licenseStatus: string;
  parserVersion: string;
  rows: ParsedTaskRow[];
  warnings: Array<{ code: string; message: string; rowNo?: number }>;
};

type RemoteSourcePayload = {
  bytes: Uint8Array;
  contentType: string;
  sourceUrl: string;
  sourceName: string;
  sha256: string;
  byteSize: number;
  storageKey: string;
};

type FetchedRemoteSourcePayload = Omit<RemoteSourcePayload, "storageKey">;

export function createTeacherImportServices(db: Db, requireTeacherDbUser: (ctx: ServiceContext) => Promise<{ db: Db; user: { id: string; role: string } }>, requireTaskByIdOrTaskId: (db: Db, taskId: string) => Promise<DbTask>, mapDbTaskToRawTask: (row: DbTask) => RawTask, serializeTeacherTask: (row: RawTask) => RawTask) {
  return {
    async listImports(ctx: ServiceContext) {
      const { user } = await requireTeacherDbUser(ctx);
      const scope = user.role === "owner" ? undefined : eq(importJobs.requestedByUserId, user.id);
      const [jobs, totals] = await Promise.all([
        db.query.importJobs.findMany({
          where: scope,
          orderBy: (row, operators) => [operators.desc(row.updatedAt)],
          limit: DEFAULT_IMPORT_LIMIT
        }),
        db.select({ value: count() }).from(importJobs).where(scope)
      ]);

      return {
        jobs: await Promise.all(jobs.map((job) => serializeImportJob(db, job))),
        total: totals[0]?.value ?? jobs.length
      };
    },

    async createImport(ctx: ServiceContext, input: CreateImportJobInput) {
      const { user } = await requireTeacherDbUser(ctx);
      if (input.sourceType === "url" && input.sourceUrl) {
        await assertSafeRemoteUrl(new URL(input.sourceUrl), getAllowedDomains());
      }
      const [job] = await db
        .insert(importJobs)
        .values({
          requestedByUserId: user.id,
          dryRun: input.dryRun ?? true,
          sourceType: input.sourceType ?? "upload",
          sourceUrl: input.sourceUrl,
          originalFilename: input.sourceType === "url" ? basename(new URL(input.sourceUrl ?? "https://example.com").pathname) || undefined : undefined,
          licenseStatus: input.licenseStatus ?? "unknown",
          status: input.sourceUrl ? "uploaded" : "draft",
          parserVersion: PARSER_VERSION,
          summary: {
            sourceName: input.sourceName ?? inferSourceNameFromUrl(input.sourceUrl),
            warnings: []
          }
        })
        .returning();

      return { job: await serializeImportJob(db, job) };
    },

    async uploadImport(ctx: ServiceContext, importId: string, request: Request) {
      const { user } = await requireTeacherDbUser(ctx);
      const job = await requireImportJob(db, importId, user);
      assertImportMutable(job, "upload");
      const upload = await readUploadPayload(request);
      const contentType = normalizeContentType(upload.contentType, upload.filename, upload.bytes);
      assertSupportedRemoteContentType(contentType);
      const sha256 = createHash("sha256").update(upload.bytes).digest("hex");
      const blob = await putPrivateImportBlob({
        bytes: upload.bytes,
        contentType,
        filename: upload.filename,
        sha256
      });

      await db
        .update(importJobs)
        .set({
          status: "uploaded",
          sourceType: "upload",
          originalFilename: upload.filename,
          storageKey: blob.storageKey,
          sha256,
          inputChecksum: sha256,
          byteSize: blob.byteSize,
          contentType: blob.contentType,
          parserVersion: PARSER_VERSION,
          updatedAt: new Date()
        })
        .where(eq(importJobs.id, job.id));

      return { job: await serializeImportJob(db, await requireImportJob(db, job.id, user)) };
    },

    async analyzeImport(ctx: ServiceContext, importId: string, input: AnalyzeImportJobInput = {}) {
      const { user } = await requireTeacherDbUser(ctx);
      const job = await requireImportJob(db, importId, user);
      assertImportMutable(job, "analyze");
      await db.update(importJobs).set({ status: "analyzing", startedAt: new Date(), updatedAt: new Date() }).where(eq(importJobs.id, job.id));

      let payload: RemoteSourcePayload;
      let parsed: ParsedImportPayload;
      try {
        payload = await loadImportPayload(job);
        parsed = await parseImportPayload({
          bytes: payload.bytes,
          contentType: payload.contentType,
          sourceUrl: payload.sourceUrl,
          originalFilename: job.originalFilename ?? undefined,
          sourceName: readJobSourceName(job),
          licenseStatus: input.licenseStatus ?? job.licenseStatus,
          parserVersion: input.parserVersion ?? job.parserVersion ?? PARSER_VERSION,
          sha256: payload.sha256,
          storageKey: payload.storageKey
        });
        parsed = await markExistingCanonicalDuplicates(db, parsed);
      } catch (error) {
        await db
          .update(importJobs)
          .set({
            status: "failed",
            finishedAt: new Date(),
            updatedAt: new Date(),
            summary: {
              ...asRecord(job.summary),
              failure: error instanceof Error ? error.message : "Import analysis failed"
            }
          })
          .where(eq(importJobs.id, job.id));
        throw error;
      }

      await db.transaction(async (tx) => {
        await tx.delete(sourceEvidence).where(
          inArray(
            sourceEvidence.importRowId,
            (
              await tx.select({ id: importRows.id }).from(importRows).where(eq(importRows.jobId, job.id))
            ).map((row) => row.id)
          )
        ).catch(() => undefined);
        await tx.delete(importRows).where(eq(importRows.jobId, job.id));

        for (const row of parsed.rows) {
          const [insertedRow] = await tx
            .insert(importRows)
            .values({
              jobId: job.id,
              rowNo: row.rowNo,
              sourceRowId: row.sourceRowId,
              sourceTaskId: row.sourceTaskId,
              status: row.status,
              errorCode: row.errorCode,
              errorMessage: row.errorMessage,
              payload: row.payload,
              normalizedTask: row.normalizedTask ?? {}
            })
            .returning();

          if (row.evidence.length > 0) {
            await tx.insert(sourceEvidence).values(
              row.evidence.map((evidence) => ({
                importRowId: insertedRow.id,
                kind: evidence.kind,
                status: (row.status === "ready" ? "verified" : "pending") as "verified" | "pending",
                label: evidence.label,
                url: evidence.url,
                checksum: evidence.checksum,
                byteSize: evidence.byteSize,
                contentType: evidence.contentType,
                storageKey: evidence.storageKey,
                licenseStatus: parsed.licenseStatus,
                parserVersion: parsed.parserVersion,
                importedAt: new Date(),
                capturedAt: new Date()
              }))
            );
          }
        }

        await tx
          .update(importJobs)
          .set({
            status: "review_ready",
            sourceType: job.sourceType ?? (job.sourceUrl ? "url" : "upload"),
            sourceUrl: payload.sourceUrl,
            storageKey: payload.storageKey,
            contentType: payload.contentType,
            sha256: payload.sha256,
            inputChecksum: payload.sha256,
            byteSize: payload.byteSize,
            parserVersion: parsed.parserVersion,
            licenseStatus: parsed.licenseStatus,
            analyzedAt: new Date(),
            updatedAt: new Date(),
            summary: buildImportSummary(parsed)
          })
          .where(eq(importJobs.id, job.id));
      });

      return { job: await serializeImportJob(db, await requireImportJob(db, job.id, user)) };
    },

    async getImport(ctx: ServiceContext, importId: string) {
      const { user } = await requireTeacherDbUser(ctx);
      return { job: await serializeImportJob(db, await requireImportJob(db, importId, user)) };
    },

    async getImportRows(ctx: ServiceContext, importId: string) {
      const { user } = await requireTeacherDbUser(ctx);
      await requireImportJob(db, importId, user);
      const rows = await db.query.importRows.findMany({
        where: (row) => eq(row.jobId, importId),
        orderBy: (row, operators) => [operators.asc(row.rowNo)]
      });

      return {
        rows: await Promise.all(rows.map((row) => serializeImportRow(db, row))),
        total: rows.length
      };
    },

    async updateImportRow(ctx: ServiceContext, importId: string, rowId: string, input: UpdateImportRowInput) {
      const { user } = await requireTeacherDbUser(ctx);
      const job = await requireImportJob(db, importId, user);
      assertImportMutable(job, "review");
      const row = await requireImportRow(db, importId, rowId);
      if (row.status === "applied") {
        throw new ApiError(409, "CONFLICT", "Applied import rows are immutable");
      }
      const mergedTask = mergeNormalizedTask(row.normalizedTask, input.normalizedTask);
      const normalizedTask = mergedTask ? normalizeImportedTask(mergedTask) : undefined;
      const nextStatus = resolveImportRowStatus(input.status, normalizedTask, input.errorMessage ?? undefined);

      const [updated] = await db
        .update(importRows)
        .set({
          status: nextStatus,
          errorCode: input.errorCode ?? null,
          errorMessage: input.errorMessage ?? null,
          normalizedTask: normalizedTask ?? {},
          updatedAt: new Date()
        })
        .where(eq(importRows.id, row.id))
        .returning();

      return { row: await serializeImportRow(db, updated) };
    },

    async applyImport(ctx: ServiceContext, importId: string, input: ApplyImportJobInput = {}) {
      const { user } = await requireTeacherDbUser(ctx);
      const job = await requireImportJob(db, importId, user);
      if (!["review_ready", "applied"].includes(job.status)) {
        throw new ApiError(409, "CONFLICT", "Import must be analyzed and reviewed before apply");
      }
      const rows = await db.query.importRows.findMany({
        where: buildImportRowsApplyFilter(importId, input.taskIds),
        orderBy: (row, operators) => [operators.asc(row.rowNo)]
      });

      if (rows.length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No import rows are ready to apply");
      }

      await db.transaction(async (tx) => {
        await tx.execute(sql`select ${importJobs.id} from ${importJobs} where ${importJobs.id} = ${job.id} for update`);
        await tx
          .update(importJobs)
          .set({ status: "applying", updatedAt: new Date(), startedAt: new Date() })
          .where(eq(importJobs.id, job.id));

        for (const row of rows) {
          const normalized = normalizeImportedTask(asRecord(row.normalizedTask));
          if (!normalized) {
            if (!input.force) {
              throw new ApiError(400, "VALIDATION_ERROR", `Import row ${row.rowNo} is missing a normalized task`);
            }
            continue;
          }

          const txDb = tx as unknown as Db;
          const existing = await findTaskForImport(txDb, normalized.task_id, normalized.source_name, normalized.source_task_id);
          const canonicalHash = computeCanonicalHash(normalized);
          const source = await ensureSource(txDb, {
            sourceId: normalized.source_id,
            name: normalized.source_name,
            url: normalized.source_url,
            licenseStatus: normalized.license_status
          });

          const values = {
            taskId: normalized.task_id,
            canonicalHash,
            learningTrack: normalized.learning_track,
            exam: normalized.exam ?? null,
            taskNumber: normalized.task_number ?? null,
            topic: normalized.topic ?? null,
            prototypeId: normalized.prototype_id ?? null,
            skillAtoms: normalized.skill_atoms,
            difficultyLevel: normalized.difficulty_level,
            sourceName: normalized.source_name,
            sourceUrl: normalized.source_url ?? null,
            sourceTaskId: normalized.source_task_id ?? null,
            statementMd: normalized.statement_md,
            answerJson: normalizeAnswerJson(normalized.answer),
            answerHash:
              normalized.answer === undefined || normalized.answer === null
                ? null
                : createHash("sha256").update(JSON.stringify(normalized.answer)).digest("hex"),
            solutionMd: normalized.solution_md ?? null,
            verificationStatus: normalized.verification_status,
            licenseStatus: normalized.license_status,
            status: (normalized.status === "needs_review" ? "draft" : normalized.status) as DbTask["status"],
            metadata: {
              import_job_id: job.id,
              source_id: source?.id,
              parser_version: job.parserVersion ?? PARSER_VERSION,
              raw_storage_key: job.storageKey,
              raw_sha256: job.sha256
            },
            updatedAt: new Date()
          };

          const task = existing
            ? (
                await tx
                  .update(tasks)
                  .set(values as Partial<typeof tasks.$inferInsert>)
                  .where(eq(tasks.id, existing.id))
                  .returning()
              )[0]
            : (
                await tx
                  .insert(tasks)
                  .values({
                    ...values,
                    subject: "informatics",
                    createdAt: new Date()
                  } as typeof tasks.$inferInsert)
                  .returning()
              )[0];

          await tx
            .update(importRows)
            .set({ taskId: task.id, status: "applied", appliedAt: new Date(), updatedAt: new Date() })
            .where(eq(importRows.id, row.id));

          const rowEvidence = await tx.query.sourceEvidence.findMany({
            where: (evidence) => eq(evidence.importRowId, row.id)
          });
          if (rowEvidence.length > 0) {
            for (const evidence of rowEvidence) {
              await tx
                .update(sourceEvidence)
                .set({
                  taskId: task.id,
                  sourceId: source?.id,
                  status: "verified",
                  importedAt: evidence.importedAt ?? new Date(),
                  updatedAt: new Date()
                })
                .where(eq(sourceEvidence.id, evidence.id));
            }
          }
        }

        await tx
          .update(importJobs)
          .set({
            status: "applied",
            dryRun: false,
            appliedAt: new Date(),
            finishedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(importJobs.id, job.id));
      });

      return { job: await serializeImportJob(db, await requireImportJob(db, importId, user)) };
    },

    async getTaskBank(ctx: ServiceContext, query: TaskBankQuery) {
      await requireTeacherDbUser(ctx);
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(MAX_TASK_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_TASK_PAGE_SIZE));
      const filters = buildTaskFilters(query);
      const orderBy = buildTaskSort(query.sortBy, query.sortOrder);

      const totalRows = await db
        .select({ value: count() })
        .from(tasks)
        .where(filters);
      const total = totalRows[0]?.value ?? 0;
      const rows = await db.query.tasks.findMany({
        where: filters,
        orderBy: [orderBy],
        limit: pageSize,
        offset: (page - 1) * pageSize
      });

      return {
        tasks: rows.map((row) => serializeTeacherTask(mapDbTaskToRawTask(row))),
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        sortBy: query.sortBy ?? "updatedAt",
        sortOrder: query.sortOrder ?? "desc"
      };
    },

    async updateTask(ctx: ServiceContext, taskId: string, input: TeacherTaskPatchInput) {
      await requireTeacherDbUser(ctx);
      const task = await requireTaskByIdOrTaskId(db, taskId);
      const [updated] = await db
        .update(tasks)
        .set({
          topic: input.topic ?? task.topic,
          taskNumber: input.taskNumber ?? task.taskNumber,
          difficultyLevel: input.difficultyLevel ?? task.difficultyLevel,
          statementMd: input.statementMd ?? task.statementMd,
          answerJson: input.answerJson === undefined ? task.answerJson : normalizeAnswerJson(input.answerJson),
          answerHash:
            input.answerJson === undefined
              ? task.answerHash
              : input.answerJson
                ? createHash("sha256").update(JSON.stringify(input.answerJson)).digest("hex")
                : null,
          solutionMd: input.solutionMd === undefined ? task.solutionMd : input.solutionMd,
          verificationStatus: input.verificationStatus ?? task.verificationStatus,
          licenseStatus: input.licenseStatus ?? task.licenseStatus,
          status: (input.status ?? task.status) as DbTask["status"],
          sourceName: input.sourceName ?? task.sourceName,
          sourceUrl: input.sourceUrl === undefined ? task.sourceUrl : input.sourceUrl,
          sourceTaskId: input.sourceTaskId === undefined ? task.sourceTaskId : input.sourceTaskId,
          skillAtoms: input.skillAtoms ?? task.skillAtoms,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, task.id))
        .returning();

      return { task: serializeTeacherTask(mapDbTaskToRawTask(updated)) };
    },

    async deleteTask(ctx: ServiceContext, taskId: string, mode: "delete" | "archive" = "delete") {
      await requireTeacherDbUser(ctx);
      const task = await requireTaskByIdOrTaskId(db, taskId);
      if (mode === "archive") {
        const [updated] = await db
          .update(tasks)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(tasks.id, task.id))
          .returning();
        return { task: serializeTeacherTask(mapDbTaskToRawTask(updated)) };
      }

      const [assignmentRefCount, attemptRefCount, planRefCount] = await Promise.all([
        db.select({ value: count() }).from(assignmentTasks).where(eq(assignmentTasks.taskId, task.id)),
        db.select({ value: count() }).from(attempts).where(eq(attempts.taskId, task.id)),
        countPlanReferences(db, task)
      ]);
      if ((assignmentRefCount[0]?.value ?? 0) > 0 || (attemptRefCount[0]?.value ?? 0) > 0 || planRefCount > 0) {
        throw new ApiError(409, "CONFLICT", "Task is referenced by assignments, attempts, or plans; archive it instead");
      }

      await db.transaction(async (tx) => {
        await tx.update(importRows).set({ taskId: null }).where(eq(importRows.taskId, task.id));
        await tx.update(sourceEvidence).set({ taskId: null }).where(eq(sourceEvidence.taskId, task.id));
        await tx.delete(taskSkillAtoms).where(eq(taskSkillAtoms.taskId, task.id));
        await tx.delete(tasks).where(eq(tasks.id, task.id));
      });

      return { task: serializeTeacherTask(mapDbTaskToRawTask({ ...task, status: "archived" })) };
    },

    async bulkTasks(ctx: ServiceContext, input: BulkTaskInput) {
      await requireTeacherDbUser(ctx);
      const taskRows = await Promise.all(input.taskIds.map((taskId) => requireTaskByIdOrTaskId(db, taskId)));
      const updatedTasks: RawTask[] = [];
      let archived = 0;
      let deleted = 0;

      for (const row of taskRows) {
        if (input.action === "delete") {
          const mode = input.patch?.status === "archived" ? "archive" : "delete";
          await this.deleteTask(ctx, row.id, mode);
          if (mode === "archive") archived += 1;
          else deleted += 1;
          continue;
        }

        const patch: TeacherTaskPatchInput =
          input.action === "archive"
            ? { ...(input.patch ?? {}), status: "archived" }
            : input.action === "activate"
              ? { ...(input.patch ?? {}), status: "active" }
              : { ...(input.patch ?? {}), status: "needs_review" };
        const result = await this.updateTask(ctx, row.id, patch);
        updatedTasks.push(result.task);
        if (patch.status === "archived") archived += 1;
      }

      return {
        updated: updatedTasks.length,
        archived,
        deleted,
        tasks: updatedTasks
      };
    }
  };
}

async function requireImportJob(db: Db, importId: string, user?: { id: string; role: string }) {
  const job = await db.query.importJobs.findFirst({ where: (row) => eq(row.id, importId) });
  if (!job) {
    throw new ApiError(404, "NOT_FOUND", "Import job was not found");
  }
  if (user && user.role !== "owner" && job.requestedByUserId !== user.id) {
    throw new ApiError(404, "NOT_FOUND", "Import job was not found");
  }
  return job;
}

function assertImportMutable(job: DbImportJob, operation: "upload" | "analyze" | "review") {
  if (["applying", "applied", "cancelled"].includes(job.status)) {
    throw new ApiError(409, "CONFLICT", `Cannot ${operation} an import in ${job.status} status`);
  }
}

async function requireImportRow(db: Db, importId: string, rowId: string) {
  const row = await db.query.importRows.findFirst({
    where: (item) => and(eq(item.id, rowId), eq(item.jobId, importId))
  });
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Import row was not found");
  }
  return row;
}

async function serializeImportJob(db: Db, job: DbImportJob) {
  const rows = await db.query.importRows.findMany({ where: (row) => eq(row.jobId, job.id) });
  const summary = asRecord(job.summary);
  return {
    id: job.id,
    status: job.status,
    dryRun: job.dryRun,
    sourceType: job.sourceType ?? null,
    sourceUrl: job.sourceUrl ?? null,
    sourceName: readJobSourceName(job) ?? null,
    originalFilename: job.originalFilename ?? null,
    byteSize: job.byteSize ?? null,
    contentType: job.contentType ?? null,
    sha256: job.sha256 ?? null,
    licenseStatus: job.licenseStatus,
    parserVersion: job.parserVersion ?? null,
    summary: {
      ...summary,
      totalRows: rows.length
    },
    warnings: Array.isArray(summary.warnings) ? summary.warnings : [],
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    analyzedAt: job.analyzedAt?.toISOString() ?? null,
    appliedAt: job.appliedAt?.toISOString() ?? null
  };
}

async function serializeImportRow(db: Db, row: DbImportRow) {
  const evidence = await db.query.sourceEvidence.findMany({
    where: (item) => eq(item.importRowId, row.id),
    orderBy: (item, operators) => [operators.asc(item.createdAt)]
  });
  return {
    id: row.id,
    rowNo: row.rowNo,
    sourceRowId: row.sourceRowId ?? null,
    sourceTaskId: row.sourceTaskId ?? null,
    status: row.status,
    errorCode: row.errorCode ?? null,
    errorMessage: row.errorMessage ?? null,
    payload: asRecord(row.payload),
    normalizedTask: Object.keys(asRecord(row.normalizedTask)).length > 0 ? asRecord(row.normalizedTask) : null,
    evidence: evidence.map(serializeEvidence),
    appliedAt: row.appliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeEvidence(evidence: DbSourceEvidence) {
  return {
    id: evidence.id,
    kind: evidence.kind,
    status: evidence.status,
    label: evidence.label,
    url: evidence.url ?? null,
    byteSize: evidence.byteSize ?? null,
    contentType: evidence.contentType ?? null,
    licenseStatus: evidence.licenseStatus,
    parserVersion: evidence.parserVersion ?? null,
    importedAt: evidence.importedAt?.toISOString() ?? null,
    capturedAt: evidence.capturedAt?.toISOString() ?? null,
    checksum: evidence.checksum ?? null
  };
}

function readJobSourceName(job: DbImportJob) {
  const summary = asRecord(job.summary);
  const sourceName = summary.sourceName;
  return typeof sourceName === "string" && sourceName.trim() ? sourceName : inferSourceNameFromUrl(job.sourceUrl ?? undefined);
}

async function readUploadPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, "VALIDATION_ERROR", "Upload exceeded the maximum size");
  }
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Expected multipart field named file");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    assertImportPayloadSize(bytes.byteLength, MAX_UPLOAD_BYTES, "Upload");
    return {
      filename: file.name || "upload.bin",
      bytes,
      contentType: file.type || "application/octet-stream"
    };
  }

  const filename = request.headers.get("x-upload-filename") ?? "upload.bin";
  const bytes = new Uint8Array(await request.arrayBuffer());
  assertImportPayloadSize(bytes.byteLength, MAX_UPLOAD_BYTES, "Upload");
  return {
    filename,
    bytes,
    contentType
  };
}

async function loadImportPayload(job: DbImportJob): Promise<RemoteSourcePayload> {
  if (job.storageKey) {
    const bytes = await getPrivateImportBlob(job.storageKey, MAX_REMOTE_BYTES);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return {
      bytes,
      contentType: job.contentType ?? detectContentType(job.originalFilename ?? job.storageKey, bytes),
      sourceUrl: job.sourceUrl ?? "",
      sourceName: readJobSourceName(job) ?? inferSourceNameFromFilename(job.originalFilename ?? job.storageKey) ?? "Uploaded file",
      sha256,
      byteSize: bytes.byteLength,
      storageKey: job.storageKey
    };
  }

  if (!job.sourceUrl) {
    throw new ApiError(400, "VALIDATION_ERROR", "Import job has no uploaded payload");
  }

  const remote = await fetchRemoteSource(job.sourceUrl);
  const filename =
    job.originalFilename ||
    basename(new URL(remote.sourceUrl).pathname) ||
    `source${extensionForContentType(remote.contentType)}`;
  const stored = await putPrivateImportBlob({
    bytes: remote.bytes,
    contentType: remote.contentType,
    filename,
    sha256: remote.sha256
  });
  return {
    ...remote,
    storageKey: stored.storageKey
  };
}

function buildImportSummary(parsed: ParsedImportPayload) {
  const counts = { ready: 0, needs_review: 0, duplicate: 0, failed: 0 };
  for (const row of parsed.rows) {
    counts[row.status] += 1;
  }
  return {
    sourceName: parsed.sourceName,
    parserVersion: parsed.parserVersion,
    licenseStatus: parsed.licenseStatus,
    counts,
    warnings: parsed.warnings
  };
}

async function findTaskForImport(db: Db, taskId: string, sourceName: string, sourceTaskId?: string) {
  return db.query.tasks.findFirst({
    where: (row) =>
      or(
        eq(row.taskId, taskId),
        sourceTaskId ? and(eq(row.sourceName, sourceName), eq(row.sourceTaskId, sourceTaskId)) : sql`false`
      )
  });
}

async function markExistingCanonicalDuplicates(db: Db, parsed: ParsedImportPayload) {
  const hashes = Array.from(
    new Set(
      parsed.rows
        .map((row) => optionalString(row.normalizedTask?.canonical_hash))
        .filter((value): value is string => Boolean(value))
    )
  );
  if (hashes.length === 0) return parsed;

  const existingTasks = await db.query.tasks.findMany({
    where: (row) => inArray(row.canonicalHash, hashes)
  });
  const existingByHash = new Map(existingTasks.filter((task) => task.canonicalHash).map((task) => [task.canonicalHash as string, task]));
  const warnings = [...parsed.warnings];
  const rows = parsed.rows.map((row) => {
    const normalized = row.normalizedTask;
    const hash = optionalString(normalized?.canonical_hash);
    const existing = hash ? existingByHash.get(hash) : undefined;
    if (
      !existing ||
      existing.taskId === normalized?.task_id ||
      (existing.sourceName === normalized?.source_name &&
        existing.sourceTaskId &&
        existing.sourceTaskId === normalized?.source_task_id)
    ) {
      return row;
    }

    warnings.push({
      code: "EXISTING_CANONICAL_DUPLICATE",
      message: `Row ${row.rowNo} matches existing task ${existing.taskId}`,
      rowNo: row.rowNo
    });
    return {
      ...row,
      status: "duplicate" as const,
      errorCode: "EXISTING_CANONICAL_DUPLICATE",
      errorMessage: `Canonical content matches existing task ${existing.taskId}`
    };
  });
  return { ...parsed, rows, warnings };
}

async function countPlanReferences(db: Db, task: DbTask) {
  const needles = [task.id, task.taskId].filter(Boolean);
  if (needles.length === 0) return 0;
  const filters = needles.map((needle) => sql`${learningPlans.planJson}::text ilike ${`%${escapeLike(needle)}%`} escape '\\'`);
  const rows = await db
    .select({ value: count() })
    .from(learningPlans)
    .where(or(...filters));
  return rows[0]?.value ?? 0;
}

async function ensureSource(db: Db, input: { sourceId: string; name: string; url?: string; licenseStatus: string }) {
  const existing = await db.query.sources.findFirst({
    where: (row) => eq(row.sourceId, input.sourceId)
  });
  if (existing) return existing;

  const [inserted] = await db
    .insert(sources)
    .values({
      sourceId: input.sourceId,
      name: input.name,
      url: input.url,
      licenseStatus: input.licenseStatus
    })
    .onConflictDoNothing({ target: sources.sourceId })
    .returning();
  return inserted ?? db.query.sources.findFirst({ where: (row) => eq(row.sourceId, input.sourceId) });
}

export function buildImportRowsApplyFilter(importId: string, taskIds?: string[]) {
  return and(
    eq(importRows.jobId, importId),
    or(eq(importRows.status, "ready"), eq(importRows.status, "applied")),
    taskIds?.length
      ? inArray(
          sql<string>`coalesce(${sql`${importRows.normalizedTask} ->> 'task_id'`}, '')`,
          taskIds
        )
      : undefined
  );
}

export function buildTaskFilters(query: TaskBankQuery) {
  const filters = [
    query.learningTrack ? eq(tasks.learningTrack, query.learningTrack) : undefined,
    query.exam ? eq(tasks.exam, query.exam) : undefined,
    query.taskNumber ? eq(tasks.taskNumber, query.taskNumber) : undefined,
    query.topic ? eq(tasks.topic, query.topic) : undefined,
    query.prototypeId ? eq(tasks.prototypeId, query.prototypeId) : undefined,
    query.difficultyLevel ? eq(tasks.difficultyLevel, query.difficultyLevel) : undefined,
    query.sourceName ? eq(tasks.sourceName, query.sourceName) : undefined,
    query.status ? eq(tasks.status, query.status as DbTask["status"]) : undefined,
    query.q
      ? or(
          ilike(tasks.statementMd, `%${escapeLike(query.q)}%`),
          ilike(tasks.topic, `%${escapeLike(query.q)}%`),
          ilike(tasks.sourceName, `%${escapeLike(query.q)}%`)
        )
      : undefined
  ].filter(Boolean);

  return filters.length > 0 ? and(...filters) : undefined;
}

function buildTaskSort(sortBy?: string, sortOrder: "asc" | "desc" = "desc") {
  const direction = sortOrder === "asc" ? asc : desc;
  switch (sortBy) {
    case "createdAt":
      return direction(tasks.createdAt);
    case "taskNumber":
      return direction(tasks.taskNumber);
    case "difficultyLevel":
      return direction(tasks.difficultyLevel);
    case "sourceName":
      return direction(tasks.sourceName);
    case "status":
      return direction(tasks.status);
    case "updatedAt":
    default:
      return direction(tasks.updatedAt);
  }
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, "\\$&");
}

function mergeNormalizedTask(current: unknown, patch: Record<string, unknown> | undefined) {
  const base = asRecord(current);
  if (!patch) {
    return Object.keys(base).length > 0 ? base : undefined;
  }
  return {
    ...base,
    ...patch
  };
}

function resolveImportRowStatus(status: string | undefined, normalizedTask: Record<string, unknown> | undefined, errorMessage?: string) {
  if (status) return status as DbImportRow["status"];
  if (errorMessage) return "needs_review";
  if (!normalizedTask) return "failed";
  return normalizedTask.status === "needs_review" || normalizedTask.verification_status === "needs_review" ? "needs_review" : "ready";
}

function normalizeAnswerJson(answer: unknown): Record<string, unknown> | null {
  if (answer === undefined || answer === null) return null;
  if (typeof answer === "object" && !Array.isArray(answer)) return answer as Record<string, unknown>;
  if (Array.isArray(answer)) return { answers: answer.map(String) };
  return { answers: [String(answer)] };
}

function normalizeImportedTask(task: Record<string, unknown> | undefined) {
  if (!task) return undefined;
  const now = new Date().toISOString();
  const difficulty = normalizeDifficulty(task.difficulty_level ?? task.difficultyLevel);
  const answer = task.answer_json ?? task.answer;
  const verificationStatus = normalizeEnum(task.verification_status, ["verified", "verified_by_source", "checked", "needs_review", "unverified", "unknown"], "needs_review");
  const licenseStatus = normalizeEnum(task.license_status, ["granted", "original", "public_reference", "needs_review", "restricted", "unknown"], "unknown");
  const status = normalizeEnum(task.status, ["active", "draft", "archived", "needs_review"], verificationStatus === "needs_review" ? "needs_review" : "active");
  return {
    task_id: stringOrDefault(task.task_id ?? task.taskId, `import-${computeCanonicalHash(task).slice(0, 16)}`),
    learning_track: stringOrDefault(task.learning_track ?? task.learningTrack, "ege_informatics"),
    exam: optionalString(task.exam),
    task_number: optionalString(task.task_number ?? task.taskNumber),
    topic: optionalString(task.topic),
    prototype_id: optionalString(task.prototype_id ?? task.prototypeId),
    skill_atoms: stringArray(task.skill_atoms ?? task.skillAtoms),
    difficulty_level: difficulty,
    source_id: stringOrDefault(task.source_id ?? task.sourceId, slugify(stringOrDefault(task.source_name ?? task.sourceName, "import-source"))),
    source_name: stringOrDefault(task.source_name ?? task.sourceName, "Imported source"),
    source_url: optionalString(task.source_url ?? task.sourceUrl),
    source_task_id: optionalString(task.source_task_id ?? task.sourceTaskId),
    statement_md: stringOrDefault(task.statement_md ?? task.statementMd, "").trim(),
    answer,
    solution_md: optionalString(task.solution_md ?? task.solutionMd),
    verification_status: verificationStatus,
    license_status: licenseStatus,
    status,
    created_at: stringOrDefault(task.created_at, now),
    updated_at: stringOrDefault(task.updated_at, now),
    canonical_hash: computeCanonicalHash(task)
  };
}

export async function parseImportPayload(input: {
  bytes: Uint8Array;
  contentType: string;
  sourceUrl?: string;
  originalFilename?: string;
  sourceName?: string;
  licenseStatus?: string;
  parserVersion?: string;
  sha256?: string;
  storageKey?: string;
}): Promise<ParsedImportPayload> {
  const parserVersion = input.parserVersion ?? PARSER_VERSION;
  const contentType = normalizeContentType(input.contentType, input.originalFilename, input.bytes);
  const sourceName = input.sourceName ?? inferSourceNameFromUrl(input.sourceUrl) ?? inferSourceNameFromFilename(input.originalFilename) ?? "Imported source";
  const licenseStatus = input.licenseStatus ?? "unknown";
  const sha256 = input.sha256 ?? createHash("sha256").update(input.bytes).digest("hex");

  let rows: ParsedTaskRow[] = [];
  let warnings: ParsedImportPayload["warnings"] = [];
  try {
    if (contentType === "application/json") {
      ({ rows, warnings } = parseJsonPayload(decodeText(input.bytes), sourceName, input.sourceUrl, licenseStatus));
    } else if (contentType === "application/x-ndjson") {
      ({ rows, warnings } = parseJsonlPayload(decodeText(input.bytes), sourceName, input.sourceUrl, licenseStatus));
    } else if (contentType === "text/csv") {
      ({ rows, warnings } = parseCsvPayload(decodeText(input.bytes), sourceName, input.sourceUrl, licenseStatus));
    } else if (contentType === "text/html") {
      ({ rows, warnings } = parseHtmlPayload(decodeText(input.bytes), sourceName, input.sourceUrl, licenseStatus, sha256));
    } else if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      ({ rows, warnings } = parseDocxPayload(input.bytes, sourceName, input.sourceUrl, licenseStatus, sha256));
    } else if (contentType === "application/pdf") {
      ({ rows, warnings } = parsePdfPayload(input.bytes, sourceName, input.sourceUrl, licenseStatus, sha256));
    } else {
      const text = decodeText(input.bytes);
      ({ rows, warnings } = parseHtmlPayload(text, sourceName, input.sourceUrl, licenseStatus, sha256));
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "VALIDATION_ERROR", "Import payload could not be parsed", {
      parserVersion,
      contentType,
      reason: error instanceof Error ? error.message : "Unknown parser error"
    });
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(400, "VALIDATION_ERROR", `Import contains more than ${MAX_IMPORT_ROWS} rows`);
  }
  if (input.storageKey) {
    rows = rows.map((row) => ({
      ...row,
      evidence: row.evidence.map((evidence) => ({ ...evidence, storageKey: input.storageKey }))
    }));
  }

  const seenTaskIds = new Set<string>();
  rows = rows.map((row) => {
    const normalizedTask = normalizeImportedTask(row.normalizedTask ?? row.payload);
    if (!normalizedTask || !normalizedTask.statement_md) {
      return {
        ...row,
        status: row.status === "failed" ? row.status : "needs_review",
        errorCode: row.errorCode ?? "MISSING_STATEMENT",
        errorMessage: row.errorMessage ?? "Statement could not be extracted",
        normalizedTask: normalizedTask ?? undefined
      };
    }
    if (seenTaskIds.has(normalizedTask.task_id)) {
      return {
        ...row,
        status: "duplicate",
        errorCode: "DUPLICATE_TASK_ID",
        errorMessage: "Duplicate task_id inside the import payload",
        normalizedTask
      };
    }
    seenTaskIds.add(normalizedTask.task_id);
    return {
      ...row,
      status:
        row.status === "failed"
          ? "failed"
          : normalizedTask.status === "needs_review" || normalizedTask.verification_status === "needs_review"
            ? "needs_review"
            : row.status,
      normalizedTask
    };
  });

  const hashes = new Map<string, number>();
  for (const row of rows) {
    const hash = typeof row.normalizedTask?.canonical_hash === "string" ? row.normalizedTask.canonical_hash : undefined;
    if (!hash) continue;
    hashes.set(hash, (hashes.get(hash) ?? 0) + 1);
  }
  for (const row of rows) {
    const hash = typeof row.normalizedTask?.canonical_hash === "string" ? row.normalizedTask.canonical_hash : undefined;
    if (hash && (hashes.get(hash) ?? 0) > 1) {
      warnings.push({
        code: "CANONICAL_HASH_COLLISION",
        message: `Canonical hash collision detected for row ${row.rowNo}`,
        rowNo: row.rowNo
      });
    }
  }

  return {
    sourceName,
    licenseStatus,
    parserVersion,
    rows,
    warnings
  };
}

function parseJsonPayload(text: string, sourceName: string, sourceUrl: string | undefined, licenseStatus: string) {
  const parsed = JSON.parse(text) as unknown;
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { tasks?: unknown[] }).tasks)
      ? (parsed as { tasks: unknown[] }).tasks
      : [parsed];
  return normalizeStructuredRows(items, sourceName, sourceUrl, licenseStatus);
}

function parseJsonlPayload(text: string, sourceName: string, sourceUrl: string | undefined, licenseStatus: string) {
  const items = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return normalizeStructuredRows(items, sourceName, sourceUrl, licenseStatus);
}

function parseCsvPayload(text: string, sourceName: string, sourceUrl: string | undefined, licenseStatus: string) {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { rows: [], warnings: [{ code: "EMPTY_CSV", message: "CSV payload is empty" }] };
  }
  const header = rows[0];
  const items = rows.slice(1).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
  return normalizeStructuredRows(items, sourceName, sourceUrl, licenseStatus);
}

function parseHtmlPayload(text: string, sourceName: string, sourceUrl: string | undefined, licenseStatus: string, sha256: string) {
  const cleanedText = normalizeWhitespace(stripHtml(text));
  const taskNumber = sourceUrl ? extractTaskNumber(sourceUrl) : undefined;
  const answer = extractAnswer(cleanedText);
  const title = extractHtmlTitle(text);
  const normalizedTask = normalizeImportedTask({
    task_id: deriveTaskId(sourceUrl, sha256),
    learning_track: "ege_informatics",
    exam: guessExam(sourceName, cleanedText),
    task_number: taskNumber,
    topic: title,
    skill_atoms: [],
    difficulty_level: "unknown",
    source_id: slugify(sourceName),
    source_name: sourceName,
    source_url: sourceUrl,
    source_task_id: extractSourceTaskId(sourceUrl),
    statement_md: cleanedText.slice(0, 6000),
    answer,
    verification_status: answer ? "verified_by_source" : "needs_review",
    license_status: guessLicenseStatus(sourceName, licenseStatus),
    status: answer ? "active" : "needs_review"
  });
  const status: ParsedTaskRow["status"] = normalizedTask?.status === "active" ? "ready" : "needs_review";
  const evidence: ParsedTaskRow["evidence"] = [
    {
      kind: sourceUrl ? "url" : "document",
      label: sourceUrl ?? `${sourceName} HTML`,
      url: sourceUrl,
      checksum: sha256,
      byteSize: text.length,
      contentType: "text/html"
    }
  ];
  const row: ParsedTaskRow = {
    rowNo: 1,
    sourceTaskId: normalizedTask?.source_task_id,
    status,
    payload: { html_excerpt: cleanedText.slice(0, 6000) },
    normalizedTask,
    evidence
  };
  return {
    rows: [row],
    warnings: answer ? [] : [{ code: "HTML_REVIEW_REQUIRED", message: "HTML extraction needs manual review" }]
  };
}

function parseDocxPayload(bytes: Uint8Array, sourceName: string, sourceUrl: string | undefined, licenseStatus: string, sha256: string) {
  const documentXml = readZipEntry(bytes, "word/document.xml");
  const text = normalizeWhitespace(stripXml(documentXml));
  return parseHtmlPayload(`<title>${sourceName}</title><body>${escapeHtml(text)}</body>`, sourceName, sourceUrl, licenseStatus, sha256);
}

function parsePdfPayload(bytes: Uint8Array, sourceName: string, sourceUrl: string | undefined, licenseStatus: string, sha256: string) {
  const text = normalizeWhitespace(extractPdfText(bytes));
  const result = parseHtmlPayload(`<title>${sourceName}</title><body>${escapeHtml(text)}</body>`, sourceName, sourceUrl, licenseStatus, sha256);
  if (text.length < 80) {
    result.rows[0].status = "needs_review";
    result.rows[0].errorCode = "PDF_TEXT_UNCERTAIN";
    result.rows[0].errorMessage = "PDF text extraction is uncertain and requires manual review";
    result.warnings.push({ code: "PDF_TEXT_UNCERTAIN", message: "PDF text extraction was uncertain" });
  }
  return result;
}

function normalizeStructuredRows(items: unknown[], sourceName: string, sourceUrl: string | undefined, licenseStatus: string) {
  const warnings: Array<{ code: string; message: string; rowNo?: number }> = [];
  const rows: ParsedTaskRow[] = items.map((item, index) => {
    const record = asRecord(item);
    const task = normalizeImportedTask({
      task_id: record.task_id ?? record.taskId ?? record.id ?? deriveTaskId(sourceUrl, createHash("sha256").update(JSON.stringify(record)).digest("hex"), index + 1),
      learning_track: record.learning_track ?? record.learningTrack ?? "ege_informatics",
      exam: record.exam,
      task_number: record.task_number ?? record.taskNumber ?? extractTaskNumber(optionalString(record.url) ?? sourceUrl ?? ""),
      topic: record.topic ?? record.title,
      prototype_id: record.prototype_id ?? record.prototypeId,
      skill_atoms: record.skill_atoms ?? record.skillAtoms ?? [],
      difficulty_level: record.difficulty_level ?? record.difficultyLevel ?? record.difficulty ?? "unknown",
      source_id: record.source_id ?? record.sourceId ?? slugify(sourceName),
      source_name: record.source_name ?? record.sourceName ?? sourceName,
      source_url: record.source_url ?? record.sourceUrl ?? sourceUrl,
      source_task_id: record.source_task_id ?? record.sourceTaskId ?? optionalString(record.id),
      statement_md: record.statement_md ?? record.statementMd ?? record.statement ?? record.question ?? "",
      answer: record.answer_json ?? record.answerJson ?? record.answer ?? extractAnswer(optionalString(record.solution_md) ?? optionalString(record.solutionMd) ?? ""),
      solution_md: record.solution_md ?? record.solutionMd,
      verification_status:
        record.verification_status ?? record.verificationStatus ?? (sourceUrl ? "verified_by_source" : "needs_review"),
      license_status: record.license_status ?? record.licenseStatus ?? guessLicenseStatus(sourceName, licenseStatus),
      status: record.status ?? (sourceUrl ? "active" : "needs_review")
    });
    const rowStatus: ParsedTaskRow["status"] =
      task?.status === "needs_review" || task?.verification_status === "needs_review" || !task?.statement_md
        ? "needs_review"
        : "ready";
    if (rowStatus === "needs_review") {
      warnings.push({
        code: "ROW_NEEDS_REVIEW",
        message: `Row ${index + 1} requires review before apply`,
        rowNo: index + 1
      });
    }
    return {
      rowNo: index + 1,
      sourceRowId: optionalString(record.row_id) ?? String(index + 1),
      sourceTaskId: task?.source_task_id,
      status: rowStatus,
      payload: record,
      normalizedTask: task,
      evidence: [
        {
          kind: sourceUrl ? "url" : "document" as const,
          label: sourceUrl ?? `${sourceName} row ${index + 1}`,
          url: sourceUrl
        }
      ]
    } satisfies ParsedTaskRow;
  });
  return { rows, warnings };
}

function parseCsv(text: string) {
  const lines: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      lines.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }
  return lines.filter((line) => line.some((item) => item.length > 0));
}

function decodeText(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function detectContentType(name: string, bytes: Uint8Array) {
  return normalizeContentType("", name, bytes);
}

function normalizeContentType(contentType: string, name: string | undefined, bytes: Uint8Array) {
  const header = contentType.split(";")[0]?.trim().toLowerCase();
  if (header && header !== "application/octet-stream") {
    if (header === "application/jsonl" || header === "application/x-jsonlines") return "application/x-ndjson";
    if (header === "text/plain" && (name?.endsWith(".jsonl") || looksLikeJsonLines(bytes))) return "application/x-ndjson";
    return header;
  }
  const fileName = name?.toLowerCase() ?? "";
  if (fileName.endsWith(".csv")) return "text/csv";
  if (fileName.endsWith(".jsonl")) return "application/x-ndjson";
  if (fileName.endsWith(".json")) return "application/json";
  if (fileName.endsWith(".html") || fileName.endsWith(".htm")) return "text/html";
  if (fileName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (looksLikePdf(bytes)) return "application/pdf";
  if (looksLikeDocx(bytes)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const text = decodeText(bytes.slice(0, Math.min(bytes.byteLength, 512)));
  if (text.trim().startsWith("{") || text.trim().startsWith("[")) return "application/json";
  if (looksLikeJsonLines(bytes)) return "application/x-ndjson";
  if (/<html|<!doctype html/i.test(text)) return "text/html";
  return "text/plain";
}

function looksLikeJsonLines(bytes: Uint8Array) {
  const text = decodeText(bytes.slice(0, Math.min(bytes.byteLength, 1024)));
  return text.split(/\r?\n/).filter(Boolean).every((line) => /^[\[{]/.test(line.trim()));
}

function looksLikePdf(bytes: Uint8Array) {
  return decodeText(bytes.slice(0, 8)).startsWith("%PDF-");
}

function looksLikeDocx(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripXml(value: string) {
  return value
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
}

function extractTaskNumber(value: string) {
  const match = value.match(/(?:task|zadanie|problem|номер|number|n)[^\d]{0,8}(\d{1,2})/i) ?? value.match(/\/(\d{1,2})(?:[/?#-]|$)/);
  return match?.[1];
}

function extractSourceTaskId(value: string | undefined) {
  if (!value) return undefined;
  const url = new URL(value);
  const pathPart = url.pathname.split("/").filter(Boolean).pop();
  return pathPart ? pathPart.slice(0, 128) : undefined;
}

function extractAnswer(text: string) {
  const match = text.match(/(?:ответ|answer)\s*[:\-]\s*([^\n.;]{1,120})/i);
  if (!match) return undefined;
  const answer = match[1].trim();
  return answer ? { answers: [answer] } : undefined;
}

function guessExam(sourceName: string, text: string) {
  if (/егэ/i.test(sourceName) || /егэ/i.test(text)) return "ЕГЭ";
  if (/огэ/i.test(sourceName) || /огэ/i.test(text)) return "ОГЭ";
  return undefined;
}

function guessLicenseStatus(sourceName: string, fallback: string) {
  if (sourceName === "EduFerma") return "original";
  if (knownAllowedDomains.some((domain) => sourceName.toLowerCase().includes(domain.split(".")[0]))) return "public_reference";
  return fallback;
}

function deriveTaskId(sourceUrl: string | undefined, sha256: string, rowNo = 1) {
  const prefix = sourceUrl ? slugify(inferSourceNameFromUrl(sourceUrl) ?? "import") : "import";
  return `${prefix}-${sha256.slice(0, 12)}-${rowNo}`;
}

function inferSourceNameFromUrl(sourceUrl: string | undefined) {
  if (!sourceUrl) return undefined;
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
    for (const [domain, label] of Object.entries(knownSourceLabels)) {
      if (host === domain || host.endsWith(`.${domain}`)) return label;
    }
    return host;
  } catch {
    return undefined;
  }
}

function inferSourceNameFromFilename(filename: string | undefined) {
  if (!filename) return undefined;
  return basename(filename, extname(filename)) || undefined;
}

export function normalizeDifficulty(value: unknown) {
  if (typeof value === "number") {
    if (value <= 1) return "basic";
    if (value === 2) return "medium";
    if (value === 3) return "advanced";
    if (value === 4 || value === 5) return "trap";
    return "unknown";
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (["basic", "easy", "1"].includes(normalized)) return "basic";
  if (["medium", "normal", "2"].includes(normalized)) return "medium";
  if (["advanced", "hard", "3"].includes(normalized)) return "advanced";
  if (["trap", "olymp", "4", "5"].includes(normalized)) return "trap";
  return "unknown";
}

function normalizeEnum(value: unknown, allowed: string[], fallback: string) {
  const normalized = String(value ?? "").trim();
  return allowed.includes(normalized) ? normalized : fallback;
}

function stringOrDefault(value: unknown, fallback: string) {
  const normalized = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return normalized || fallback;
}

function optionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "source";
}

function computeCanonicalHash(value: unknown) {
  const record = asRecord(value);
  return createHash("sha256")
    .update(
      JSON.stringify({
        statement: stringOrDefault(record.statement_md ?? record.statementMd, ""),
        answer: record.answer_json ?? record.answerJson ?? record.answer,
        source: optionalString(record.source_url ?? record.sourceUrl),
        sourceTaskId: optionalString(record.source_task_id ?? record.sourceTaskId),
        taskNumber: optionalString(record.task_number ?? record.taskNumber)
      })
    )
    .digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "text/csv":
      return ".csv";
    case "application/json":
      return ".json";
    case "application/x-ndjson":
      return ".jsonl";
    case "text/html":
      return ".html";
    case "application/pdf":
      return ".pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    default:
      return ".bin";
  }
}

export async function fetchRemoteSource(sourceUrl: string): Promise<FetchedRemoteSourcePayload> {
  const allowlist = getAllowedDomains();
  let nextUrl = sourceUrl;
  let redirects = 0;

  while (true) {
    const url = new URL(nextUrl);
    await assertSafeRemoteUrl(url, allowlist);
    enforceRequestRate(url.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/html,application/json,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" },
        signal: controller.signal
      });
      if (response.headers.get("set-cookie")) {
        throw new ApiError(400, "VALIDATION_ERROR", "Remote source attempted to set cookies");
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new ApiError(400, "VALIDATION_ERROR", "Redirect response did not include a location header");
        }
        redirects += 1;
        if (redirects > MAX_REMOTE_REDIRECTS) {
          throw new ApiError(400, "VALIDATION_ERROR", "Too many redirects while fetching remote source");
        }
        nextUrl = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) {
        throw new ApiError(400, "VALIDATION_ERROR", `Remote source returned ${response.status}`);
      }
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_BYTES) {
        throw new ApiError(400, "VALIDATION_ERROR", "Remote source exceeded the maximum size");
      }
      const contentType = normalizeContentType(response.headers.get("content-type") ?? "", basename(url.pathname), new Uint8Array());
      assertSupportedRemoteContentType(contentType);
      const bytes = await readResponseBodyWithLimit(response.body, MAX_REMOTE_BYTES);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      return {
        bytes,
        contentType,
        sourceUrl: url.toString(),
        sourceName: inferSourceNameFromUrl(url.toString()) ?? url.hostname,
        sha256,
        byteSize: bytes.byteLength
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(400, "VALIDATION_ERROR", "Remote source timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function getAllowedDomains() {
  const configured = ALLOWLIST_ENV_KEYS.flatMap((key) => (process.env[key] ?? "").split(","))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...knownAllowedDomains, ...configured]);
}

async function assertSafeRemoteUrl(url: URL, allowlist: Set<string>) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Only http and https URLs are supported");
  }
  if (url.username || url.password) {
    throw new ApiError(400, "VALIDATION_ERROR", "Credentials in import URLs are not allowed");
  }
  const hostname = url.hostname.toLowerCase();
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Non-standard ports are not allowed for URL imports");
  }
  if (isIP(hostname)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Import URLs must use an allowlisted domain name");
  }
  if (!isAllowlistedHost(hostname, allowlist)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Source domain is not allowlisted");
  }
  if (isIpAddressBlocked(hostname)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Source IP range is not allowed");
  }

  const resolved = await lookup(hostname, { all: true });
  if (resolved.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Source host did not resolve");
  }
  for (const entry of resolved) {
    if (isIpAddressBlocked(entry.address)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Source DNS resolved to a blocked IP range");
    }
  }
}

function isAllowlistedHost(hostname: string, allowlist: Set<string>) {
  for (const domain of allowlist) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return true;
  }
  return false;
}

function enforceRequestRate(hostname: string) {
  const now = Date.now();
  const state = requestWindow.get(hostname);
  if (!state || now - state.startedAt > 60_000) {
    requestWindow.set(hostname, { startedAt: now, count: 1 });
    return;
  }
  if (state.count >= MAX_REMOTE_REQUESTS_PER_HOST_PER_MINUTE) {
    throw new ApiError(429, "RATE_LIMITED", "Too many import requests to this source host");
  }
  state.count += 1;
}

function assertSupportedRemoteContentType(contentType: string) {
  const allowed = new Set([
    "text/html",
    "application/json",
    "application/x-ndjson",
    "text/csv",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ]);
  if (!allowed.has(contentType)) {
    throw new ApiError(400, "VALIDATION_ERROR", `Unsupported import content type: ${contentType}`);
  }
}

export function isIpAddressBlocked(address: string): boolean {
  if (address === "localhost" || address === "0.0.0.0") return true;
  if (address.includes(":")) return isBlockedIpv6(address);
  const parts = address.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => Number.isNaN(item) || item < 0 || item > 255)) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && (b === 168 || b === 0 || b === 88)) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  const mappedIpv4 = parseMappedIpv4(normalized);
  if (mappedIpv4) return isIpAddressBlocked(mappedIpv4);
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized === "::" ||
    normalized.startsWith("ff")
  );
}

function parseMappedIpv4(address: string) {
  if (!address.startsWith("::ffff:")) return undefined;
  const suffix = address.slice("::ffff:".length);
  if (suffix.includes(".")) return suffix;
  const [high, low] = suffix.split(":");
  if (!high || !low) return undefined;
  const highValue = Number.parseInt(high, 16);
  const lowValue = Number.parseInt(low, 16);
  if (!Number.isFinite(highValue) || !Number.isFinite(lowValue)) return undefined;
  return `${highValue >> 8}.${highValue & 0xff}.${lowValue >> 8}.${lowValue & 0xff}`;
}

async function readResponseBodyWithLimit(stream: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      assertImportPayloadSize(total, maxBytes, "Remote source");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function assertImportPayloadSize(size: number, maxBytes: number, label: string) {
  if (size > maxBytes) {
    throw new ApiError(400, "VALIDATION_ERROR", `${label} exceeded the maximum size`);
  }
}

function readZipEntry(bytes: Uint8Array, entryName: string) {
  if (bytes.byteLength < 22) throw new Error("DOCX archive is too small");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) throw new Error("DOCX archive is missing EOCD");
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  if (centralDirectoryOffset < 0 || centralDirectoryOffset >= bytes.byteLength) {
    throw new Error("DOCX central directory is invalid");
  }
  let offset = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > bytes.byteLength) throw new Error("DOCX central directory is truncated");
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const compression = view.getUint16(offset + 10, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decodeText(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    if (name === entryName) {
      if (localHeaderOffset + 30 > bytes.byteLength) throw new Error("DOCX local header is invalid");
      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      if (dataStart + compressedSize > bytes.byteLength) throw new Error("DOCX entry is truncated");
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      if (compression === 0) return decodeText(compressed);
      if (compression === 8) {
        return decodeText(inflateRawSync(compressed, { maxOutputLength: MAX_EXTRACTED_TEXT_BYTES }));
      }
      throw new Error(`Unsupported DOCX compression method ${compression}`);
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error(`DOCX entry ${entryName} was not found`);
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  return -1;
}

export function extractPdfText(bytes: Uint8Array) {
  const text = decodeText(bytes);
  const pieces: string[] = [];
  for (const match of text.matchAll(/\(([^()]*)\)\s*Tj/g)) {
    pieces.push(match[1]);
  }
  for (const match of text.matchAll(/\[([^\]]+)\]\s*TJ/g)) {
    pieces.push(match[1].replace(/\([^)]*\)/g, (chunk) => chunk.slice(1, -1)));
  }
  return pieces.join(" ").replace(/\\([nrtbf()\\])/g, "$1");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
