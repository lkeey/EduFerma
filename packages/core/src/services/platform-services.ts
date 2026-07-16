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
import type {
  ApiSetupState,
  AttemptResult,
  CreateAssignmentInput,
  CreateScheduleEventInput,
  ReviewAttemptInput,
  ServiceContext,
  SubmitAttemptInput,
  UpdateAssignmentInput,
  UpdatePlanInput
} from "./types";

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
        return {
          user: ctx.user,
          accessStatus: {
            state: ctx.user.role === "guest" ? "missing" : "active",
            subjectId: ctx.user.id,
            requestStatus: null,
            requestedRole: null,
            currentRole: ctx.user.role,
            reason: null,
            reviewedAt: null,
            lastSeenAt: null
          }
        };
      },
      async getAccessStatus(ctx: ServiceContext) {
        return {
          accessStatus: {
            state: ctx.user.role === "guest" ? "missing" : "active",
            subjectId: ctx.user.id,
            requestStatus: null,
            requestedRole: null,
            currentRole: ctx.user.role,
            reason: null,
            reviewedAt: null,
            lastSeenAt: null
          }
        };
      }
    },
    student: {
      async getDashboard(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return {
          assignments: demoAssignments,
          progress: demoProgress,
          schedule: demoSchedule.slice(0, 1)
        };
      },
      async getSchedule(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { events: demoSchedule };
      },
      async getPlan(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { plan: demoPlan };
      },
      async getAssignments(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { assignments: demoAssignments };
      },
      async getAssignment(_ctx: ServiceContext | undefined, assignmentId: string) {
        ensureAvailable(state);
        return {
          assignment: demoAssignments.find((assignment) => assignment.id === assignmentId) || demoAssignments[0],
          tasks: demoTasks.map(serializeStudentTask)
        };
      },
      async getTask(_ctx: ServiceContext | undefined, taskId: string) {
        ensureAvailable(state);
        return { task: serializeStudentTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async submitAttempt(
        ctxOrInput: ServiceContext | SubmitAttemptInput | undefined,
        maybeInput?: SubmitAttemptInput
      ): Promise<AttemptResult> {
        ensureAvailable(state);
        const input = maybeInput ?? (ctxOrInput as SubmitAttemptInput);
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
      async getProgress(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { progress: demoProgress };
      }
    },
    teacher: {
      async getDashboard(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { students: demoStudents, pendingReview: 1, progress: demoProgress };
      },
      async getStudents(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { students: demoStudents };
      },
      async getStudent(_ctx: ServiceContext | undefined, studentId: string) {
        ensureAvailable(state);
        return { student: demoStudents.find((student) => student.id === studentId) || demoStudents[0] };
      },
      async getStudentPlan(_ctx: ServiceContext | undefined, studentId: string) {
        ensureAvailable(state);
        return { plan: { ...demoPlan, student_id: studentId } };
      },
      async updateStudentPlan(_ctx: ServiceContext | undefined, studentId: string, _input?: UpdatePlanInput) {
        ensureAvailable(state);
        return { plan: { ...demoPlan, student_id: studentId, updated: true } };
      },
      async getStudentSchedule(_ctx: ServiceContext | undefined, _studentId: string) {
        ensureAvailable(state);
        return { events: demoSchedule };
      },
      async createStudentScheduleEvent(
        _ctx: ServiceContext | undefined,
        _studentId: string,
        _input?: CreateScheduleEventInput
      ) {
        ensureAvailable(state);
        return { event: demoSchedule[0] };
      },
      async getStudentAssignments(_ctx: ServiceContext | undefined, _studentId: string) {
        ensureAvailable(state);
        return { assignments: demoAssignments };
      },
      async getStudentAnalytics(_ctx: ServiceContext | undefined, _studentId: string) {
        ensureAvailable(state);
        return { progress: demoProgress };
      },
      async getTaskBank(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { tasks: demoTasks.map(serializeTeacherTask), page: 1, pageSize: 20, total: demoTasks.length };
      },
      async getTask(_ctx: ServiceContext | undefined, taskId: string) {
        ensureAvailable(state);
        return { task: serializeTeacherTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async getAssignments(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { assignments: demoAssignments };
      },
      async getAssignment(_ctx: ServiceContext | undefined, assignmentId: string) {
        ensureAvailable(state);
        return {
          assignment: demoAssignments.find((assignment) => assignment.id === assignmentId) || demoAssignments[0],
          tasks: demoTasks.map(serializeTeacherTask)
        };
      },
      async createAssignment(_ctx: ServiceContext | undefined, _input?: CreateAssignmentInput) {
        ensureAvailable(state);
        return { assignment: demoAssignments[0] };
      },
      async updateAssignment(_ctx: ServiceContext | undefined, assignmentId: string, _input?: UpdateAssignmentInput) {
        ensureAvailable(state);
        return { assignment: { ...demoAssignments[0], id: assignmentId, updated: true } };
      },
      async publishAssignment(_ctx: ServiceContext | undefined, assignmentId: string) {
        ensureAvailable(state);
        return { assignment: { ...demoAssignments[0], id: assignmentId, status: "assigned" } };
      },
      async getPendingReviewAttempts(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { attempts: [{ id: "demo-attempt", assignmentId: "demo-assignment", studentId: "demo-student" }] };
      },
      async reviewAttempt(
        ctxOrAttemptId: ServiceContext | string | undefined,
        maybeAttemptId?: string,
        _input?: ReviewAttemptInput
      ) {
        ensureAvailable(state);
        const attemptId = typeof ctxOrAttemptId === "string" ? ctxOrAttemptId : maybeAttemptId;
        return { attempt: { id: attemptId, status: "checked" } };
      }
    },
    owner: {
      async getAccessStatus(ctx?: ServiceContext) {
        return {
          accessStatus: {
            state: ctx?.user.role === "guest" ? "missing" : "active",
            subjectId: ctx?.user.id ?? null,
            requestStatus: null,
            requestedRole: null,
            currentRole: ctx?.user.role ?? null,
            reason: null,
            reviewedAt: null,
            lastSeenAt: null
          }
        };
      },
      async listAccess() {
        ensureAvailable(state);
        return { requests: [], users: [] };
      },
      async getAccessRequest() {
        ensureAvailable(state);
        throw new SetupRequiredError("Owner access detail requires a database");
      },
      async getUserAccess() {
        ensureAvailable(state);
        throw new SetupRequiredError("Owner user access detail requires a database");
      },
      async approveAccessRequest() {
        ensureAvailable(state);
        throw new SetupRequiredError("Owner access approval requires a database");
      },
      async rejectAccessRequest() {
        ensureAvailable(state);
        throw new SetupRequiredError("Owner access rejection requires a database");
      },
      async updateUserAccess() {
        ensureAvailable(state);
        throw new SetupRequiredError("Owner user access updates require a database");
      }
    }
  };
}
