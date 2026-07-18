import { TeacherTaskBankQuerySchema, type TeacherTaskBankQuery } from "@eduferma/validators";

export type TaskBankSearchParams = Record<string, string | undefined>;

export function parseTeacherTaskBankSearchParams(filters: TaskBankSearchParams): TeacherTaskBankQuery {
  const parsed = TeacherTaskBankQuerySchema.safeParse({
    page: filters.page ? Number(filters.page) : 1,
    pageSize: filters.pageSize ? Number(filters.pageSize) : 20,
    q: filters.q,
    learningTrack: filters.learning_track,
    exam: filters.exam,
    taskNumber: filters.task_number,
    topic: filters.topic,
    prototypeId: filters.prototype_id,
    difficultyLevel: filters.difficulty_level,
    sourceName: filters.source_name,
    status: filters.status,
    sortBy: filters.sort_by,
    sortOrder: (filters.sort_order as "asc" | "desc" | undefined) ?? "desc"
  });

  return parsed.success ? parsed.data : TeacherTaskBankQuerySchema.parse({});
}

export function buildTaskBankPageHref(filters: TaskBankSearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `/teacher/task-bank?${params.toString()}`;
}
