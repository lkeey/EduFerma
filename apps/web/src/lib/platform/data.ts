import {
  checkAnswer,
  demoAssignments,
  demoAttempts,
  demoPlan,
  demoPrototypeMastery,
  demoSchedule,
  demoSkillMastery,
  demoStudents,
  demoTasks,
  demoUsers,
  getAssignmentProgress,
  getSafeTaskForStudent,
  getTaskForTeacher
} from "@eduferma/core";
import type { MistakeTag, PlatformTask, TaskAttempt } from "@eduferma/core";

export function getDemoTeacher() {
  return demoUsers.find((user) => user.role === "teacher")!;
}

export function getDemoStudent() {
  return demoStudents[0]!;
}

export async function getStudentDashboard(studentId = "demo_student_oge") {
  const student = demoStudents.find((item) => item.id === studentId)!;
  const assignments = demoAssignments.filter((assignment) => assignment.studentId === studentId);
  const nextLesson = demoSchedule.find((event) => event.studentId === studentId && event.status === "planned");
  const latestAttempts = demoAttempts.filter((attempt) => attempt.studentId === studentId).slice(-5).reverse();
  const activeAssignment = assignments[0];

  return {
    student,
    nextLesson,
    activeAssignment,
    activeAssignmentProgress: activeAssignment ? getAssignmentProgress(activeAssignment, demoAttempts) : null,
    latestAttempts,
    weakSkills: demoSkillMastery.filter((item) => item.studentId === studentId && item.confidence < 0.6)
  };
}

export async function getStudentSchedule(studentId = "demo_student_oge") {
  return demoSchedule.filter((event) => event.studentId === studentId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getStudentPlan(studentId = "demo_student_oge") {
  return demoPlan.studentId === studentId ? demoPlan : null;
}

export async function getStudentAssignments(studentId = "demo_student_oge") {
  return demoAssignments
    .filter((assignment) => assignment.studentId === studentId)
    .map((assignment) => ({
      assignment,
      progress: getAssignmentProgress(assignment, demoAttempts)
    }));
}

export async function getAssignmentDetail(assignmentId: string, studentView = true) {
  const assignment = demoAssignments.find((item) => item.id === assignmentId);
  if (!assignment) return null;

  const tasks = assignment.taskIds
    .map((taskId) => demoTasks.find((task) => task.id === taskId))
    .filter((task): task is PlatformTask => Boolean(task))
    .map((task) => (studentView ? getSafeTaskForStudent(task) : getTaskForTeacher(task)));

  const attempts = demoAttempts.filter((attempt) => attempt.assignmentId === assignmentId);

  return {
    assignment,
    tasks,
    attempts,
    progress: getAssignmentProgress(assignment, demoAttempts)
  };
}

export async function getStudentTask(taskId: string) {
  const task = demoTasks.find((item) => item.id === taskId || item.taskId === taskId);
  return task ? getSafeTaskForStudent(task) : null;
}

export async function getTeacherTask(taskId: string) {
  return demoTasks.find((item) => item.id === taskId || item.taskId === taskId) ?? null;
}

export async function getStudentProgress(studentId = "demo_student_oge") {
  const attempts = demoAttempts.filter((attempt) => attempt.studentId === studentId);
  const solved = attempts.filter((attempt) => attempt.submittedAt).length;
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  return {
    solved,
    correct,
    correctRate: solved === 0 ? 0 : Math.round((correct / solved) * 100),
    activeAssignments: demoAssignments.filter((assignment) => assignment.studentId === studentId && assignment.status === "assigned").length,
    skillMastery: demoSkillMastery.filter((item) => item.studentId === studentId),
    prototypeMastery: demoPrototypeMastery.filter((item) => item.studentId === studentId),
    weakSkills: demoSkillMastery.filter((item) => item.studentId === studentId && item.confidence < 0.6),
    recentAttempts: attempts.slice(-5).reverse()
  };
}

export async function getTeacherDashboard() {
  const pendingReview = demoAttempts.filter((attempt) => attempt.checkStatus === "pending_review");
  return {
    students: demoStudents,
    nextLessons: demoSchedule.filter((event) => event.status === "planned"),
    pendingReview,
    recentAttempts: demoAttempts.slice(-5).reverse(),
    riskyStudents: demoStudents.filter((student) => student.riskLevel !== "low"),
    needsReviewTasks: demoTasks.filter((task) => task.status === "needs_review" || task.verificationStatus === "needs_review")
  };
}

export async function getTeacherStudents() {
  return demoStudents.map((student) => ({
    student,
    nextLesson: demoSchedule.find((event) => event.studentId === student.id && event.status === "planned"),
    activeAssignments: demoAssignments.filter((assignment) => assignment.studentId === student.id && assignment.status === "assigned"),
    progress: demoSkillMastery.filter((item) => item.studentId === student.id)
  }));
}

export async function getTeacherStudentDetail(studentId: string) {
  const student = demoStudents.find((item) => item.id === studentId);
  if (!student) return null;
  return {
    student,
    plan: demoPlan,
    schedule: await getStudentSchedule(studentId),
    assignments: await getStudentAssignments(studentId),
    attempts: demoAttempts.filter((attempt) => attempt.studentId === studentId),
    mastery: await getStudentProgress(studentId)
  };
}

export async function getTeacherTaskBank(filters: Record<string, string | undefined> = {}) {
  return demoTasks.filter((task) => {
    if (filters.learning_track && task.learningTrack !== filters.learning_track) return false;
    if (filters.exam && task.exam !== filters.exam) return false;
    if (filters.task_number && task.taskNumber !== filters.task_number) return false;
    if (filters.difficulty_level && task.difficultyLevel !== filters.difficulty_level) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return `${task.statementMd} ${task.topic} ${task.skillAtoms.join(" ")}`.toLowerCase().includes(q);
    }
    return true;
  });
}

export async function submitTaskAttempt({
  studentId,
  assignmentId,
  taskId,
  answer
}: {
  studentId: string;
  assignmentId: string;
  taskId: string;
  answer: string;
}) {
  const task = demoTasks.find((item) => item.id === taskId || item.taskId === taskId);
  if (!task) throw new Error("Task not found");
  const result = checkAnswer(task.answerJson, answer);
  const attempt: TaskAttempt = {
    id: `attempt_${Date.now()}`,
    studentId,
    assignmentId,
    taskId: task.id,
    attemptNo: demoAttempts.filter((item) => item.studentId === studentId && item.taskId === task.id).length + 1,
    startedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    answerJson: { value: answer },
    isCorrect: result.isCorrect,
    scoreAwarded: result.scoreAwarded,
    checkStatus: result.checkStatus,
    feedbackMd: result.feedbackMd,
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
  const attempt = demoAttempts.find((item) => item.id === attemptId);
  if (!attempt) throw new Error("Attempt not found");

  return {
    ...attempt,
    scoreAwarded,
    feedbackMd,
    mistakeTags,
    isCorrect,
    checkStatus: isCorrect ? "reviewed_correct" : "reviewed_incorrect",
    checkedBy: "user_teacher_demo"
  } satisfies TaskAttempt;
}
