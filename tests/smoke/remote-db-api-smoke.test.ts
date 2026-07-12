import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { GET as getDbHealth } from "../../apps/web/src/app/api/health/db/route";
import { GET as getStudentAssignment } from "../../apps/web/src/app/api/v1/student/assignments/[assignmentId]/route";
import { GET as getStudentDashboard } from "../../apps/web/src/app/api/v1/student/dashboard/route";
import { GET as getStudentTask } from "../../apps/web/src/app/api/v1/student/tasks/[taskId]/route";
import { POST as submitStudentAttempt } from "../../apps/web/src/app/api/v1/student/tasks/[taskId]/attempts/route";
import { GET as getTeacherTaskBank } from "../../apps/web/src/app/api/v1/teacher/task-bank/route";
import { GET as getTeacherTask } from "../../apps/web/src/app/api/v1/teacher/tasks/[taskId]/route";
import { hasRuntimeDatabaseEnv, isProductionDatabaseEnvironment } from "../../packages/db/src/config";
import { getDb } from "../../packages/db/src/client";
import {
  assignmentTasks,
  assignments,
  attempts,
  learningPlans,
  scheduleEvents,
  skillMastery,
  students,
  tasks,
  users
} from "../../packages/db/src/schema";

const shouldRunRemoteDbSmoke = process.env.EDUFERMA_RUN_REMOTE_DB_TESTS === "true" && hasRuntimeDatabaseEnv();

const runRemoteDbSmoke = shouldRunRemoteDbSmoke ? describe : describe.skip;

type SmokeIds = {
  ownerUserId?: string;
  studentUserId?: string;
  studentId?: string;
  taskId?: string;
  taskPublicId?: string;
  assignmentId?: string;
  assignmentTaskId?: string;
};

const previousEnv = { ...process.env };
const ids: SmokeIds = {};
const smokeRunId = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const ownerProviderUserId = `demo-owner-${smokeRunId}`;
const studentProviderUserId = `demo-student-${smokeRunId}`;
const ownerEmail = `owner-${smokeRunId}@example.test`;
const studentEmail = `student-${smokeRunId}@example.test`;

function apiRequest(pathname: string, init: RequestInit = {}) {
  return new Request(`http://localhost${pathname}`, init);
}

function demoHeaders(role: "owner" | "student") {
  return {
    "x-demo-role": role,
    "x-demo-user-id": role === "owner" ? ownerProviderUserId : studentProviderUserId,
    "x-demo-email": role === "owner" ? ownerEmail : studentEmail
  };
}

async function json(response: Response) {
  const payload = await response.json();
  return payload as Record<string, unknown>;
}

runRemoteDbSmoke("remote DB API smoke tests", () => {
  beforeAll(async () => {
    if (isProductionDatabaseEnvironment()) {
      throw new Error("Remote DB smoke tests must not run against a production-marked database environment.");
    }

    process.env.ENABLE_DEMO_AUTH = "true";
    process.env.NODE_ENV = "test";
    await seedSmokeRows();
  });

  afterAll(async () => {
    await cleanupSmokeRows();
    process.env = { ...previousEnv };
  });

  it("uses the configured remote DB for health and representative student/teacher API routes", async () => {
    const healthResponse = await getDbHealth(apiRequest("/api/health/db", { headers: demoHeaders("owner") }));
    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toMatchObject({ database: true });

    const dashboardResponse = await getStudentDashboard(apiRequest("/api/v1/student/dashboard", { headers: demoHeaders("student") }));
    const dashboard = await json(dashboardResponse);
    expect(dashboardResponse.status).toBe(200);
    expect(JSON.stringify(dashboard)).toContain(ids.assignmentId);
    expect(JSON.stringify(dashboard)).toContain(`Remote DB smoke lesson ${smokeRunId}`);
    expect(JSON.stringify(dashboard)).toContain(`remote_db_smoke_skill_${smokeRunId}`);

    const assignmentResponse = await getStudentAssignment(
      apiRequest(`/api/v1/student/assignments/${ids.assignmentId}`, { headers: demoHeaders("student") }),
      { params: Promise.resolve({ assignmentId: ids.assignmentId! }) }
    );
    const assignment = await json(assignmentResponse);
    expect(assignmentResponse.status).toBe(200);
    expect(JSON.stringify(assignment)).toContain(ids.taskPublicId);
    expect(assignment).not.toHaveProperty("answer_json");
    expect(JSON.stringify(assignment)).not.toContain("solution_md");
    expect(JSON.stringify(assignment)).not.toContain("teacher_notes");
    expect(JSON.stringify(assignment)).not.toContain("local_source_path");

    const studentTaskResponse = await getStudentTask(
      apiRequest(`/api/v1/student/tasks/${ids.taskPublicId}`, { headers: demoHeaders("student") }),
      { params: Promise.resolve({ taskId: ids.taskPublicId! }) }
    );
    const studentTask = await json(studentTaskResponse);
    expect(studentTaskResponse.status).toBe(200);
    expect(studentTask).toMatchObject({ task: { task_id: ids.taskPublicId } });
    expect(JSON.stringify(studentTask)).not.toContain("answer_json");
    expect(JSON.stringify(studentTask)).not.toContain("solution_md");
    expect(JSON.stringify(studentTask)).not.toContain("teacher_notes");
    expect(JSON.stringify(studentTask)).not.toContain("local_source_path");

    const submitResponse = await submitStudentAttempt(
      apiRequest(`/api/v1/student/tasks/${ids.taskPublicId}/attempts`, {
        method: "POST",
        headers: { ...demoHeaders("student"), "content-type": "application/json" },
        body: JSON.stringify({
          assignmentId: ids.assignmentId,
          answer: "42",
          timeSpentSec: 30
        })
      }),
      { params: Promise.resolve({ taskId: ids.taskPublicId! }) }
    );
    const attempt = await json(submitResponse);
    expect(submitResponse.status).toBe(201);
    expect(attempt).toMatchObject({ checkStatus: "checked", isCorrect: true });
    expect(typeof attempt.attemptId).toBe("string");

    const taskBankResponse = await getTeacherTaskBank(apiRequest("/api/v1/teacher/task-bank", { headers: demoHeaders("owner") }));
    const taskBank = await json(taskBankResponse);
    expect(taskBankResponse.status).toBe(200);
    expect(JSON.stringify(taskBank)).toContain(ids.taskPublicId);

    const teacherTaskResponse = await getTeacherTask(
      apiRequest(`/api/v1/teacher/tasks/${ids.taskPublicId}`, { headers: demoHeaders("owner") }),
      { params: Promise.resolve({ taskId: ids.taskPublicId! }) }
    );
    const teacherTask = await json(teacherTaskResponse);
    expect(teacherTaskResponse.status).toBe(200);
    expect(teacherTask).toMatchObject({
      task: {
        task_id: ids.taskPublicId,
        answer_json: { answers: ["42"] },
        solution_md: expect.stringContaining("42"),
        teacher_notes: expect.stringContaining(smokeRunId),
        local_source_path: expect.stringContaining(smokeRunId)
      }
    });
  });
});

async function seedSmokeRows() {
  const db = getDb();
  const now = new Date();
  const startsAt = new Date(now.getTime() + 86_400_000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
  ids.taskPublicId = `remote-db-smoke-${smokeRunId}`;

  const [owner] = await db
    .insert(users)
    .values({
      email: ownerEmail,
      authProviderUserId: ownerProviderUserId,
      displayName: `Remote DB Smoke Owner ${smokeRunId}`,
      role: "owner"
    })
    .returning();
  ids.ownerUserId = owner.id;

  const [studentUser] = await db
    .insert(users)
    .values({
      email: studentEmail,
      authProviderUserId: studentProviderUserId,
      displayName: `Remote DB Smoke Student User ${smokeRunId}`,
      role: "student"
    })
    .returning();
  ids.studentUserId = studentUser.id;

  const [student] = await db
    .insert(students)
    .values({
      userId: studentUser.id,
      tutorUserId: owner.id,
      publicCode: `remote-db-smoke-${smokeRunId}`,
      displayName: `Remote DB Smoke Student ${smokeRunId}`,
      learningTrack: "ege_informatics",
      goalSummary: `Remote DB smoke goal ${smokeRunId}`,
      metadata: { next_topic: `remote_db_smoke_next_topic_${smokeRunId}` }
    })
    .returning();
  ids.studentId = student.id;

  const [task] = await db
    .insert(tasks)
    .values({
      taskId: ids.taskPublicId,
      canonicalHash: `remote-db-smoke-${smokeRunId}`,
      learningTrack: "ege_informatics",
      exam: "ЕГЭ",
      subject: "Информатика",
      taskNumber: "7",
      topic: "Remote DB smoke",
      prototypeId: `remote_db_smoke_${smokeRunId}`,
      skillAtoms: [`remote_db_smoke_skill_${smokeRunId}`],
      difficultyLevel: "basic",
      sourceName: "EduFerma remote DB smoke test",
      statementMd: `Remote DB smoke statement ${smokeRunId}: answer 42.`,
      answerJson: { answers: ["42"] },
      solutionMd: `Remote DB smoke solution ${smokeRunId}: 40 + 2 = 42.`,
      verificationStatus: "verified",
      licenseStatus: "original",
      status: "active",
      metadata: {
        teacher_notes: `Remote DB smoke teacher notes ${smokeRunId}`,
        local_source_path: `/tmp/remote-db-smoke/${smokeRunId}.md`
      },
      updatedAt: now
    })
    .returning();
  ids.taskId = task.id;

  const [assignment] = await db
    .insert(assignments)
    .values({
      studentId: student.id,
      tutorUserId: owner.id,
      title: `Remote DB smoke assignment ${smokeRunId}`,
      descriptionMd: "Created by gated remote DB smoke tests.",
      status: "assigned",
      publishedAt: now,
      dueAt: startsAt
    })
    .returning();
  ids.assignmentId = assignment.id;

  const [assignmentTask] = await db
    .insert(assignmentTasks)
    .values({
      assignmentId: assignment.id,
      taskId: task.id,
      position: 0,
      orderIndex: 0
    })
    .returning();
  ids.assignmentTaskId = assignmentTask.id;

  await db.insert(skillMastery).values({
    studentId: student.id,
    skillAtom: `remote_db_smoke_skill_${smokeRunId}`,
    prototypeId: `remote_db_smoke_${smokeRunId}`,
    attempts: 1,
    correct: 1,
    level: "ready",
    lastAttemptAt: now
  });

  await db.insert(scheduleEvents).values({
    studentId: student.id,
    assignmentId: assignment.id,
    title: `Remote DB smoke lesson ${smokeRunId}`,
    startsAt,
    endsAt,
    status: "planned"
  });

  await db.insert(learningPlans).values({
    studentId: student.id,
    learningTrack: "ege_informatics",
    strategy: `Remote DB smoke plan ${smokeRunId}`,
    planJson: {
      title: `Remote DB smoke plan ${smokeRunId}`,
      milestones: [`remote_db_smoke_milestone_${smokeRunId}`]
    }
  });
}

async function cleanupSmokeRows() {
  if (!shouldRunRemoteDbSmoke || !hasRuntimeDatabaseEnv()) return;
  if (isProductionDatabaseEnvironment()) return;
  const db = getDb();

  if (ids.assignmentTaskId) {
    await db.delete(attempts).where(eq(attempts.assignmentTaskId, ids.assignmentTaskId));
  }
  if (ids.studentId) {
    await db.delete(scheduleEvents).where(eq(scheduleEvents.studentId, ids.studentId));
  }
  if (ids.assignmentId) {
    await db.delete(assignmentTasks).where(eq(assignmentTasks.assignmentId, ids.assignmentId));
    await db.delete(assignments).where(eq(assignments.id, ids.assignmentId));
  }
  if (ids.studentId) {
    await db.delete(skillMastery).where(eq(skillMastery.studentId, ids.studentId));
    await db.delete(learningPlans).where(eq(learningPlans.studentId, ids.studentId));
    await db.delete(students).where(eq(students.id, ids.studentId));
  }
  if (ids.taskId) {
    await db.delete(tasks).where(eq(tasks.id, ids.taskId));
  }
  const userIds = [ids.ownerUserId, ids.studentUserId].filter((value): value is string => Boolean(value));
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
}
