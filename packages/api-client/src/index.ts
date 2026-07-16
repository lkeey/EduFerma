import { z } from "zod";

export * from "./client";
export * from "./imports";
export * from "./owner";
export * from "./plans";
export * from "./publications";
export * from "./student";
export * from "./teacher";

export const ApiSourceSchema = z.object({
  kind: z.enum(["database", "demo-fallback"]),
  reason: z.string().optional()
});

export const TaskSummarySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  learningTrack: z.string(),
  exam: z.string().nullable(),
  taskNumber: z.string().nullable(),
  topic: z.string().nullable(),
  prototypeId: z.string().nullable(),
  difficultyLevel: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string().nullable(),
  status: z.string(),
  updatedAt: z.string()
});

export const TaskBankResponseSchema = z.object({
  source: ApiSourceSchema,
  totalTasks: z.number().int().nonnegative(),
  activeTasks: z.number().int().nonnegative(),
  tasks: z.array(TaskSummarySchema)
});

export const StudentAssignmentSchema = z.object({
  title: z.string(),
  status: z.string(),
  due: z.string(),
  score: z.string()
});

export const MasteryRowSchema = z.object({
  skill: z.string(),
  value: z.number().int().min(0).max(100)
});

export const StudentDashboardResponseSchema = z.object({
  source: ApiSourceSchema,
  metrics: z.object({
    nextLesson: z.string(),
    activeAssignments: z.string(),
    averageProgress: z.string(),
    answers: z.string()
  }),
  assignments: z.array(StudentAssignmentSchema),
  mastery: z.array(MasteryRowSchema)
});

export const TeacherStudentRowSchema = z.object({
  student: z.string(),
  track: z.string(),
  next: z.string(),
  risk: z.string()
});

export const TeacherDashboardResponseSchema = z.object({
  source: ApiSourceSchema,
  metrics: z.object({
    students: z.string(),
    assignmentsToReview: z.string(),
    taskBank: z.string(),
    consent: z.string()
  }),
  students: z.array(TeacherStudentRowSchema),
  mastery: z.array(MasteryRowSchema),
  taskBank: TaskBankResponseSchema
});

export type ApiSource = z.infer<typeof ApiSourceSchema>;
export type TaskSummary = z.infer<typeof TaskSummarySchema>;
export type MasteryRow = z.infer<typeof MasteryRowSchema>;
export type TaskBankResponse = z.infer<typeof TaskBankResponseSchema>;
export type StudentDashboardResponse = z.infer<typeof StudentDashboardResponseSchema>;
export type TeacherDashboardResponse = z.infer<typeof TeacherDashboardResponseSchema>;

async function getJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`EduFerma API request failed: ${response.status} ${response.statusText}`);
  }

  return schema.parse(await response.json());
}

export function getTaskBank(init?: RequestInit) {
  return getJson("/api/v1/task-bank", TaskBankResponseSchema, init);
}

export function getStudentDashboard(init?: RequestInit) {
  return getJson("/api/v1/student/dashboard", StudentDashboardResponseSchema, init);
}

export function getTeacherDashboard(init?: RequestInit) {
  return getJson("/api/v1/teacher/dashboard", TeacherDashboardResponseSchema, init);
}
