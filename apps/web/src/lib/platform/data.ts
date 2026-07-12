import "server-only";

import type { MistakeTag, TaskAttempt } from "@eduferma/core/platform";
import { getCurrentServiceUser } from "@/server/auth/session";
import { getServices } from "@/server/services";
import {
  emptyAssignmentProgress,
  type LegacyAssignment,
  type LegacyScheduleEvent,
  type LegacyTask,
  toLegacyAssignment,
  toLegacyAssignmentRow,
  toLegacyPlan,
  toLegacyScheduleEvent,
  toLegacySkill,
  toLegacyStudent,
  toLegacyTask
} from "./page-data-adapters";

type LegacyPracticeTask = LegacyTask & { assignmentId?: string };

type LegacyAttempt = {
  id: string;
  taskId?: string;
  answerJson?: { value?: string };
  checkStatus?: string;
  feedbackMd?: string;
};

async function getContext() {
  const user = await getCurrentServiceUser();
  if (!user) {
    throw new Error("Authenticated user is required before reading platform data");
  }
  return { user };
}

function getDisplayName(emailOrName: string | undefined) {
  return emailOrName?.trim() || "Ученик";
}

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toLegacyAttempt(attempt: Record<string, unknown>): LegacyAttempt {
  return {
    id: String(attempt.id ?? "attempt"),
    taskId: typeof attempt.taskId === "string" ? attempt.taskId : typeof attempt.task_id === "string" ? attempt.task_id : undefined,
    answerJson: typeof attempt.answerJson === "object" && attempt.answerJson
      ? attempt.answerJson as { value?: string }
      : typeof attempt.answer_json === "object" && attempt.answer_json
        ? attempt.answer_json as { value?: string }
        : undefined,
    checkStatus: typeof attempt.checkStatus === "string" ? attempt.checkStatus : typeof attempt.check_status === "string" ? attempt.check_status : undefined,
    feedbackMd: typeof attempt.feedbackMd === "string" ? attempt.feedbackMd : typeof attempt.feedback_md === "string" ? attempt.feedback_md : undefined
  };
}

function toProgressSummary(progressRows: Array<{ skill_atom: string; value: number }>, assignments: Array<{ status?: string }> = []) {
  const skillMastery = progressRows.map(toLegacySkill);
  const weakSkills = skillMastery.filter((item) => item.confidence < 0.6);

  return {
    solved: 0,
    correct: 0,
    correctRate: 0,
    activeAssignments: assignments.filter((assignment) => assignment.status === "assigned").length,
    skillMastery,
    prototypeMastery: [] as Array<{ prototypeId: string; confidence: number; riskFlag?: string }>,
    weakSkills,
    recentAttempts: [] as LegacyAttempt[]
  };
}

export function getDemoTeacher() {
  return {
    id: "current_teacher",
    email: "",
    name: "Преподаватель",
    role: "teacher" as const
  };
}

export function getDemoStudent() {
  return toLegacyStudent(undefined, "Ученик");
}

export async function getStudentProfile() {
  const ctx = await getContext();
  return toLegacyStudent(undefined, getDisplayName(ctx.user.name ?? ctx.user.email));
}

export async function getStudentDashboard() {
  const ctx = await getContext();
  const [{ assignments, progress, schedule }, student] = await Promise.all([
    getServices().student.getDashboard(ctx),
    getStudentProfile()
  ]);
  const legacyAssignments = asArray(assignments).map(toLegacyAssignment);
  const activeAssignment = legacyAssignments[0];
  const weakSkills = asArray(progress).map(toLegacySkill).filter((item) => item.confidence < 0.6);

  return {
    student,
    nextLesson: asArray(schedule).map(toLegacyScheduleEvent)[0],
    activeAssignment,
    activeAssignmentProgress: activeAssignment ? emptyAssignmentProgress(activeAssignment.score) : null,
    latestAttempts: [] as LegacyAttempt[],
    weakSkills
  };
}

export async function getStudentSchedule() {
  const ctx = await getContext();
  const { events } = await getServices().student.getSchedule(ctx);
  return asArray(events).map(toLegacyScheduleEvent);
}

export async function getStudentPlan() {
  const ctx = await getContext();
  const { plan } = await getServices().student.getPlan(ctx);
  return toLegacyPlan(plan);
}

export async function getStudentAssignments() {
  const ctx = await getContext();
  const { assignments } = await getServices().student.getAssignments(ctx);
  return asArray(assignments).map(toLegacyAssignmentRow);
}

export async function getStudentPracticeTasks() {
  const ctx = await getContext();
  const { assignments } = await getServices().student.getAssignments(ctx);
  const taskGroups = await Promise.all(
    asArray(assignments).map(async (assignment) => {
      const detail = await getServices().student.getAssignment(ctx, assignment.id);
      return asArray(detail.tasks).map((task): LegacyPracticeTask => ({
        ...toLegacyTask(task, { studentSafe: true }),
        assignmentId: assignment.id
      }));
    })
  );
  const seen = new Set<string>();

  return taskGroups.flat().filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

export async function getAssignmentDetail(assignmentId: string, studentView = true) {
  const ctx = await getContext();
  if (!studentView) return null;
  const detail = await getServices().student.getAssignment(ctx, assignmentId);

  if (!detail.assignment) return null;
  const assignment = toLegacyAssignment(detail.assignment);
  const tasks = asArray(detail.tasks).map((task) => toLegacyTask(task, { studentSafe: true }));

  return {
    assignment,
    tasks,
    attempts: [] as LegacyAttempt[],
    progress: emptyAssignmentProgress(assignment.score)
  };
}

export async function getStudentTask(taskId: string) {
  const ctx = await getContext();
  const { task } = await getServices().student.getTask(ctx, taskId);
  return task ? toLegacyTask(task, { studentSafe: true }) : null;
}

export async function getTeacherTask(taskId: string) {
  const ctx = await getContext();
  const { task } = await getServices().teacher.getTask(ctx, taskId);
  return task ? toLegacyTask(task) : null;
}

export async function getStudentProgress() {
  const ctx = await getContext();
  const [{ progress }, { assignments }] = await Promise.all([
    getServices().student.getProgress(ctx),
    getServices().student.getAssignments(ctx)
  ]);
  return toProgressSummary(asArray(progress), asArray(assignments));
}

export async function getTeacherDashboard() {
  const ctx = await getContext();
  const [dashboard, pendingReview, taskBank] = await Promise.all([
    getServices().teacher.getDashboard(ctx),
    getServices().teacher.getPendingReviewAttempts(ctx),
    getServices().teacher.getTaskBank(ctx)
  ]);
  const students = asArray(dashboard.students).map((student) => toLegacyStudent(student));
  const attempts = asArray(pendingReview.attempts as Array<Record<string, unknown>>).map(toLegacyAttempt);
  const tasks = asArray(taskBank.tasks).map((task) => toLegacyTask(task));

  return {
    students,
    nextLessons: [],
    pendingReview: attempts,
    recentAttempts: attempts.slice(0, 5),
    riskyStudents: students.filter((student) => student.riskLevel !== "low"),
    needsReviewTasks: tasks.filter((task) => task.status === "needs_review" || task.verificationStatus === "needs_review")
  };
}

export async function getTeacherStudents() {
  const ctx = await getContext();
  const { students } = await getServices().teacher.getStudents(ctx);
  return asArray(students).map((student): {
    student: ReturnType<typeof toLegacyStudent>;
    nextLesson?: LegacyScheduleEvent;
    activeAssignments: LegacyAssignment[];
    progress: Array<{ skillAtom: string; confidence: number; riskFlag?: string }>;
  } => ({
    student: toLegacyStudent(student),
    nextLesson: undefined,
    activeAssignments: [],
    progress: []
  }));
}

export async function getTeacherAssignments() {
  const ctx = await getContext();
  const services = getServices();
  const { students } = await services.teacher.getStudents(ctx);
  const assignmentGroups = await Promise.all(
    asArray(students).map(async (student) => {
      const { assignments } = await services.teacher.getStudentAssignments(ctx, student.id);
      const legacyStudent = toLegacyStudent(student);

      return asArray(assignments).map((assignment) => ({
        student: legacyStudent,
        ...toLegacyAssignmentRow(assignment)
      }));
    })
  );

  return assignmentGroups.flat();
}

export async function getTeacherStudentDetail(studentId: string) {
  const ctx = await getContext();
  const services = getServices();
  const [studentResponse, planResponse, scheduleResponse, assignmentResponse, analyticsResponse, pendingReview] = await Promise.all([
    services.teacher.getStudent(ctx, studentId),
    services.teacher.getStudentPlan(ctx, studentId),
    services.teacher.getStudentSchedule(ctx, studentId),
    services.teacher.getStudentAssignments(ctx, studentId),
    services.teacher.getStudentAnalytics(ctx, studentId),
    services.teacher.getPendingReviewAttempts(ctx)
  ]);

  if (!studentResponse.student) return null;
  const assignments = asArray(assignmentResponse.assignments).map(toLegacyAssignmentRow);
  const attempts = asArray(pendingReview.attempts as Array<Record<string, unknown>>).map(toLegacyAttempt);

  return {
    student: toLegacyStudent(studentResponse.student),
    plan: toLegacyPlan(planResponse.plan) ?? {
      id: `plan_${studentId}`,
      studentId,
      strategy: "План пока не создан",
      title: "План пока не создан",
      versionNo: 0,
      status: "missing",
      lessons: []
    },
    schedule: asArray(scheduleResponse.events).map(toLegacyScheduleEvent),
    assignments,
    attempts,
    mastery: toProgressSummary(asArray(analyticsResponse.progress), assignments.map((row) => row.assignment))
  };
}

export async function getTeacherTaskBank(filters: Record<string, string | undefined> = {}) {
  const ctx = await getContext();
  const { tasks } = await getServices().teacher.getTaskBank(ctx);
  return asArray(tasks)
    .map((task) => toLegacyTask(task))
    .filter((task) => {
      if (filters.learning_track && task.learningTrack !== filters.learning_track) return false;
      if (filters.exam && task.exam !== filters.exam) return false;
      if (filters.task_number && task.taskNumber !== filters.task_number) return false;
      if (filters.difficulty_level && task.difficultyLevel !== filters.difficulty_level) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        return `${task.statementMd ?? ""} ${task.topic ?? ""} ${(task.skillAtoms ?? []).join(" ")}`.toLowerCase().includes(q);
      }
      return true;
    });
}

export async function submitTaskAttempt({
  assignmentId,
  taskId,
  answer
}: {
  studentId: string;
  assignmentId: string;
  taskId: string;
  answer: string;
}) {
  const ctx = await getContext();
  const result = await getServices().student.submitAttempt(ctx, { assignmentId, taskId, answer });
  const legacyCheckStatus: TaskAttempt["checkStatus"] = result.checkStatus === "pending_review"
    ? "pending_review"
    : result.isCorrect
      ? "auto_correct"
      : "auto_incorrect";
  const attempt: TaskAttempt = {
    id: result.attemptId,
    studentId: ctx.user.id,
    assignmentId,
    taskId,
    attemptNo: 1,
    startedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    answerJson: { value: answer },
    isCorrect: result.isCorrect,
    scoreAwarded: result.isCorrect ? 1 : 0,
    checkStatus: legacyCheckStatus,
    feedbackMd: result.feedback,
    mistakeTags: []
  };

  return { attempt, result };
}

export async function reviewAttempt({
  attemptId,
  scoreAwarded,
  feedbackMd,
  mistakeTags,
  isCorrect
}: {
  attemptId: string;
  scoreAwarded: number;
  feedbackMd: string;
  mistakeTags: MistakeTag[];
  isCorrect: boolean;
}) {
  const ctx = await getContext();
  const { attempt } = await getServices().teacher.reviewAttempt(ctx, attemptId, { scoreAwarded, feedbackMd, mistakeTags, isCorrect });
  return attempt;
}
