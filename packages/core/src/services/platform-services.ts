import { checkShortAnswer } from "../answer-checking";
import { SetupRequiredError } from "./errors";
import {
  demoAssignments,
  demoPlan,
  demoProgress,
  demoSchedule,
  demoStudents,
  demoTasks
} from "./fixtures";
import { serializeStudentTask, serializeTeacherTask } from "./serializers";
import type { ApiSetupState, AttemptResult, ServiceContext } from "./types";

type ServiceOptions = {
  state: ApiSetupState;
};

function ensureAvailable(state: ApiSetupState) {
  if (state === "unavailable") {
    throw new SetupRequiredError();
  }
}

export function createPlatformServices(options: ServiceOptions) {
  const { state } = options;

  return {
    common: {
      async getMe(ctx: ServiceContext) {
        return { user: ctx.user };
      }
    },
    student: {
      async getDashboard() {
        ensureAvailable(state);
        return {
          assignments: demoAssignments,
          progress: demoProgress,
          schedule: demoSchedule.slice(0, 1)
        };
      },
      async getSchedule() {
        ensureAvailable(state);
        return { events: demoSchedule };
      },
      async getPlan() {
        ensureAvailable(state);
        return { plan: demoPlan };
      },
      async getAssignments() {
        ensureAvailable(state);
        return { assignments: demoAssignments };
      },
      async getAssignment(assignmentId: string) {
        ensureAvailable(state);
        return {
          assignment: demoAssignments.find((assignment) => assignment.id === assignmentId) || demoAssignments[0],
          tasks: demoTasks.map(serializeStudentTask)
        };
      },
      async getTask(taskId: string) {
        ensureAvailable(state);
        return { task: serializeStudentTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async submitAttempt(input: { taskId: string; answer: string }): Promise<AttemptResult> {
        ensureAvailable(state);
        const task = demoTasks.find((row) => row.task_id === input.taskId || row.id === input.taskId) || demoTasks[0];
        const expected = (task.answer_json as { answers?: string[] } | undefined)?.answers || [];
        const result = expected.length > 0 ? checkShortAnswer(expected, input.answer) : undefined;
        return {
          attemptId: "demo-attempt-submitted",
          checkStatus: result ? "checked" : "pending_review",
          isCorrect: result?.correct,
          feedback: result?.correct ? "Верно." : "Ответ принят, проверьте решение с преподавателем.",
          nextAllowedAction: result ? "continue" : "wait_review"
        };
      },
      async getProgress() {
        ensureAvailable(state);
        return { progress: demoProgress };
      }
    },
    teacher: {
      async getDashboard() {
        ensureAvailable(state);
        return { students: demoStudents, pendingReview: 1, progress: demoProgress };
      },
      async getStudents() {
        ensureAvailable(state);
        return { students: demoStudents };
      },
      async getStudent(studentId: string) {
        ensureAvailable(state);
        return { student: demoStudents.find((student) => student.id === studentId) || demoStudents[0] };
      },
      async getStudentPlan(studentId: string) {
        ensureAvailable(state);
        return { plan: { ...demoPlan, student_id: studentId } };
      },
      async updateStudentPlan(studentId: string) {
        ensureAvailable(state);
        return { plan: { ...demoPlan, student_id: studentId, updated: true } };
      },
      async getStudentSchedule() {
        ensureAvailable(state);
        return { events: demoSchedule };
      },
      async createStudentScheduleEvent() {
        ensureAvailable(state);
        return { event: demoSchedule[0] };
      },
      async getStudentAssignments() {
        ensureAvailable(state);
        return { assignments: demoAssignments };
      },
      async getStudentAnalytics() {
        ensureAvailable(state);
        return { progress: demoProgress };
      },
      async getTaskBank() {
        ensureAvailable(state);
        return { tasks: demoTasks.map(serializeTeacherTask), page: 1, pageSize: 20, total: demoTasks.length };
      },
      async getTask(taskId: string) {
        ensureAvailable(state);
        return { task: serializeTeacherTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async createAssignment() {
        ensureAvailable(state);
        return { assignment: demoAssignments[0] };
      },
      async updateAssignment(assignmentId: string) {
        ensureAvailable(state);
        return { assignment: { ...demoAssignments[0], id: assignmentId, updated: true } };
      },
      async publishAssignment(assignmentId: string) {
        ensureAvailable(state);
        return { assignment: { ...demoAssignments[0], id: assignmentId, status: "assigned" } };
      },
      async getPendingReviewAttempts() {
        ensureAvailable(state);
        return { attempts: [{ id: "demo-attempt", assignmentId: "demo-assignment", studentId: "demo-student" }] };
      },
      async reviewAttempt(attemptId: string) {
        ensureAvailable(state);
        return { attempt: { id: attemptId, status: "checked" } };
      }
    }
  };
}
