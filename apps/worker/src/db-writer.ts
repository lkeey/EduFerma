import { inArray, sql } from "drizzle-orm";
import { getDb, tasks } from "@eduferma/db";
import type { TaskImportWriter } from "@eduferma/core/task-sources";
import type { PlatformTask } from "@eduferma/validators";

type RemoteDbTaskImportWriterOptions = {
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 500;

export function createRemoteDbTaskImportWriter(options: RemoteDbTaskImportWriterOptions = {}): TaskImportWriter {
  if (!process.env.DATABASE_URL) {
    throw new Error("--apply requires DATABASE_URL; worker never falls back to local task storage in apply mode");
  }

  const db = getDb();
  const batchSize = normalizeBatchSize(options.batchSize);

  return {
    async getExistingTaskIds(taskIds) {
      if (taskIds.length === 0) return new Set<string>();
      const rows = await db
        .select({ taskId: tasks.taskId })
        .from(tasks)
        .where(inArray(tasks.taskId, taskIds));
      return new Set(rows.map((row) => row.taskId));
    },

    async upsertTasks(platformTasks) {
      if (platformTasks.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const existingIds = await this.getExistingTaskIds(platformTasks.map((task) => task.task_id));
      for (const batch of chunk(platformTasks, batchSize)) {
        await db
          .insert(tasks)
          .values(batch.map(toTaskInsert))
          .onConflictDoUpdate({
            target: tasks.taskId,
            set: {
              learningTrack: excluded("learning_track"),
              exam: excluded("exam"),
              taskNumber: excluded("task_number"),
              topic: excluded("topic"),
              prototypeId: excluded("prototype_id"),
              skillAtoms: excluded("skill_atoms"),
              difficultyLevel: excluded("difficulty_level"),
              sourceName: excluded("source_name"),
              sourceUrl: excluded("source_url"),
              sourceTaskId: excluded("source_task_id"),
              statementMd: excluded("statement_md"),
              answerHash: excluded("answer_hash"),
              solutionMd: excluded("solution_md"),
              verificationStatus: excluded("verification_status"),
              licenseStatus: excluded("license_status"),
              status: excluded("status"),
              metadata: excluded("metadata"),
              updatedAt: new Date()
            }
          });
      }

      return {
        inserted: platformTasks.filter((task) => !existingIds.has(task.task_id)).length,
        updated: platformTasks.filter((task) => existingIds.has(task.task_id)).length
      };
    }
  };
}

function toTaskInsert(task: PlatformTask): typeof tasks.$inferInsert {
  return {
    taskId: task.task_id,
    learningTrack: task.learning_track,
    exam: task.exam,
    taskNumber: task.task_number === undefined ? undefined : String(task.task_number),
    topic: task.topic,
    prototypeId: task.prototype_id,
    skillAtoms: task.skill_atoms,
    difficultyLevel: task.difficulty_level,
    sourceName: task.source_name,
    sourceUrl: task.source_url || undefined,
    sourceTaskId: task.source_task_id,
    statementMd: task.statement_md,
    answerHash: task.answer === undefined ? undefined : JSON.stringify(task.answer),
    solutionMd: task.solution_md,
    verificationStatus: task.verification_status,
    licenseStatus: task.license_status,
    status: task.status,
    metadata: {
      source_id: task.source_id,
      local_source_path: task.local_source_path,
      attachments: task.attachments,
      solution_language: task.solution_language,
      schema_version: task.schema_version
    },
    createdAt: new Date(task.created_at),
    updatedAt: new Date(task.updated_at)
  };
}

function excluded(columnName: string) {
  return sql.raw(`excluded.${columnName}`);
}

function normalizeBatchSize(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.floor(value);
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
