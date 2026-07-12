import "server-only";

import type {
  ApiSource,
  MasteryRow,
  StudentDashboardResponse,
  TaskBankResponse,
  TaskSummary,
  TeacherDashboardResponse
} from "@eduferma/api-client";
import { assignmentRows, masteryRows, teacherRows } from "@/lib/demo-data";
import { getDb, assignments, lessons, skillMastery, students, tasks } from "@eduferma/db";
import { desc, eq, sql } from "drizzle-orm";

const TASK_BANK_LIMIT = 25;

export async function getPlatformTaskBank(): Promise<TaskBankResponse> {
  return withDatabaseFallback<TaskBankResponse>(
    async () => {
      const db = getDb();
      const [counts] = await db
        .select({
          totalTasks: sql<number>`count(*)::int`,
          activeTasks: sql<number>`count(*) filter (where ${tasks.status} = 'active')::int`
        })
        .from(tasks);

      const taskRows = await db
        .select({
          id: tasks.id,
          taskId: tasks.taskId,
          learningTrack: tasks.learningTrack,
          exam: tasks.exam,
          taskNumber: tasks.taskNumber,
          topic: tasks.topic,
          prototypeId: tasks.prototypeId,
          difficultyLevel: tasks.difficultyLevel,
          sourceName: tasks.sourceName,
          sourceUrl: tasks.sourceUrl,
          status: tasks.status,
          updatedAt: tasks.updatedAt
        })
        .from(tasks)
        .orderBy(desc(tasks.updatedAt))
        .limit(TASK_BANK_LIMIT);

      return {
        source: { kind: "database" },
        totalTasks: counts?.totalTasks ?? 0,
        activeTasks: counts?.activeTasks ?? 0,
        tasks: taskRows.map(toTaskSummary)
      };
    },
    () => demoTaskBank("DATABASE_URL is not configured; showing demo fallback")
  );
}

export async function getStudentDashboardData(): Promise<StudentDashboardResponse> {
  return withDatabaseFallback<StudentDashboardResponse>(
    async () => {
      const db = getDb();
      const [studentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(students);
      const assignmentRowsFromDb = await db
        .select({
          title: assignments.title,
          status: assignments.status,
          dueAt: assignments.dueAt
        })
        .from(assignments)
        .orderBy(desc(assignments.updatedAt))
        .limit(10);
      const mastery = await getMasteryRows();
      const activeAssignments = assignmentRowsFromDb.filter((row) => row.status === "assigned").length;

      return {
        source: { kind: "database" },
        metrics: {
          nextLesson: await getNextLessonLabel(),
          activeAssignments: String(activeAssignments || assignmentRowsFromDb.length),
          averageProgress: `${averageMastery(mastery)}%`,
          answers: "скрыты"
        },
        assignments: assignmentRowsFromDb.map((row) => ({
          title: row.title,
          status: row.status,
          due: formatDate(row.dueAt),
          score: "ожидает проверки"
        })),
        mastery
      };
    },
    () => ({
      source: demoSource("DATABASE_URL is not configured; showing demo fallback"),
      metrics: {
        nextLesson: "Сегодня",
        activeAssignments: "2 активных",
        averageProgress: "71%",
        answers: "скрыты"
      },
      assignments: assignmentRows,
      mastery: masteryRows
    })
  );
}

export async function getTeacherDashboardData(): Promise<TeacherDashboardResponse> {
  return withDatabaseFallback<TeacherDashboardResponse>(
    async () => {
      const db = getDb();
      const taskBank = await getPlatformTaskBank();
      const studentRows = await db
        .select({
          student: students.displayName,
          track: students.learningTrack,
          goalSummary: students.goalSummary
        })
        .from(students)
        .orderBy(desc(students.updatedAt))
        .limit(10);
      const [submittedAssignments] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assignments)
        .where(eq(assignments.status, "submitted"));
      const mastery = await getMasteryRows();

      return {
        source: { kind: "database" },
        metrics: {
          students: String(studentRows.length),
          assignmentsToReview: String(submittedAssignments?.count ?? 0),
          taskBank: `${taskBank.activeTasks} active / ${taskBank.totalTasks} total`,
          consent: "strict"
        },
        students: studentRows.map((row) => ({
          student: row.student,
          track: row.track,
          next: row.goalSummary || "план уточняется",
          risk: "не рассчитан"
        })),
        mastery,
        taskBank
      };
    },
    () => ({
      source: demoSource("DATABASE_URL is not configured; showing demo fallback"),
      metrics: {
        students: "3 demo",
        assignmentsToReview: "1",
        taskBank: "demo fallback",
        consent: "strict"
      },
      students: teacherRows,
      mastery: masteryRows,
      taskBank: demoTaskBank("DATABASE_URL is not configured; showing demo fallback")
    })
  );
}

async function getMasteryRows(): Promise<MasteryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      skill: skillMastery.skillAtom,
      attempts: skillMastery.attempts,
      correct: skillMastery.correct
    })
    .from(skillMastery)
    .orderBy(desc(skillMastery.updatedAt))
    .limit(8);

  return rows.map((row) => ({
    skill: row.skill,
    value: row.attempts > 0 ? Math.round((row.correct / row.attempts) * 100) : 0
  }));
}

async function getNextLessonLabel() {
  const db = getDb();
  const [lesson] = await db
    .select({ startsAt: lessons.startsAt })
    .from(lessons)
    .orderBy(desc(lessons.startsAt))
    .limit(1);

  return formatDate(lesson?.startsAt);
}

async function withDatabaseFallback<T>(query: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!process.env.DATABASE_URL) {
    return fallback();
  }

  try {
    return await query();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    const result = fallback();
    if (isSourcedResponse(result)) {
      result.source.reason = "Database query failed in local/dev; showing demo fallback";
    }
    return result;
  }
}

function demoTaskBank(reason: string): TaskBankResponse {
  return {
    source: demoSource(reason),
    totalTasks: 0,
    activeTasks: 0,
    tasks: []
  };
}

function demoSource(reason: string): ApiSource {
  return { kind: "demo-fallback", reason };
}

function toTaskSummary(row: {
  id: string;
  taskId: string;
  learningTrack: string;
  exam: string | null;
  taskNumber: string | null;
  topic: string | null;
  prototypeId: string | null;
  difficultyLevel: string;
  sourceName: string;
  sourceUrl: string | null;
  status: string;
  updatedAt: Date;
}): TaskSummary {
  return {
    ...row,
    updatedAt: row.updatedAt.toISOString()
  };
}

function averageMastery(rows: MasteryRow[]) {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.value, 0) / rows.length);
}

function formatDate(value?: Date | null) {
  if (!value) return "не назначено";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short"
  }).format(value);
}

function isSourcedResponse(value: unknown): value is { source: ApiSource } {
  return Boolean(value && typeof value === "object" && "source" in value);
}
