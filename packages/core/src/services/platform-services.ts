import { checkShortAnswer } from "../answer-checking";
import { SetupRequiredError } from "./errors";
import {
  demoAnalytics,
  demoAssignments,
  demoPlanAdjustments,
  demoPlanEvents,
  demoPlanHistory,
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
  PlanAdjustmentSummary,
  PlanHistoryResponse,
  ReviewAttemptInput,
  ServiceContext,
  StudentAnalyticsResponse,
  SubmitAttemptInput,
  TeacherAnalyticsResponse,
  TeacherPlanResponse,
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

function demoTeacherPlan(studentId: string): TeacherPlanResponse {
  return {
    draft_plan: {
      ...demoPlan,
      id: "demo-plan-v2-draft",
      student_id: studentId,
      version_no: 2,
      status: "draft",
      change_summary: "Черновик с уточненными уроками."
    },
    active_plan: {
      ...demoPlan,
      student_id: studentId
    },
    pending_adjustments: demoPlanAdjustments.map((adjustment) => ({
      ...adjustment,
      plan_id: "demo-plan-v2-draft"
    })),
    recent_events: demoPlanEvents
  };
}

function demoPlanHistoryResponse(studentId: string): PlanHistoryResponse {
  return {
    history: demoPlanHistory.map((plan) => ({ ...plan, student_id: studentId })),
    change_events: demoPlanEvents
  };
}

function demoFeedbackPreview(planId: string, proposals: PlanAdjustmentSummary[] = demoPlanAdjustments) {
  return {
    preview: {
      plan_id: planId,
      signals: proposals.map((proposal) => proposal.signal),
      proposals: proposals.map((proposal) => ({ ...proposal, plan_id: planId }))
    }
  };
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
        const { student_id: _studentId, rationale: _rationale, change_summary: _changeSummary, ...studentPlan } = demoPlan;
        return {
          plan: {
            ...studentPlan,
            lessons: demoPlan.lessons.map((lesson) => ({
              ...lesson,
              teacher_notes: undefined
            }))
          }
        };
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
      },
      async getAnalytics(_ctx?: ServiceContext): Promise<StudentAnalyticsResponse> {
        ensureAvailable(state);
        return { analytics: demoAnalytics };
      }
    },
    teacher: {
      async listImports(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { jobs: [], total: 0 };
      },
      async createImport(_ctx: ServiceContext | undefined, input?: { sourceType?: string; sourceUrl?: string }) {
        ensureAvailable(state);
        return {
          job: {
            id: "demo-import",
            status: input?.sourceUrl ? "uploaded" : "draft",
            dryRun: true,
            sourceType: input?.sourceType ?? "upload",
            sourceUrl: input?.sourceUrl ?? null,
            sourceName: "Demo import",
            originalFilename: null,
            byteSize: null,
            contentType: null,
            sha256: null,
            licenseStatus: "unknown",
            parserVersion: "demo",
            summary: {},
            warnings: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            analyzedAt: null,
            appliedAt: null
          }
        };
      },
      async uploadImport() {
        ensureAvailable(state);
        return this.createImport(undefined, { sourceType: "upload" });
      },
      async analyzeImport() {
        ensureAvailable(state);
        return this.createImport(undefined, { sourceType: "upload" });
      },
      async getImport() {
        ensureAvailable(state);
        return this.createImport(undefined, { sourceType: "upload" });
      },
      async getImportRows() {
        ensureAvailable(state);
        return { rows: [], total: 0 };
      },
      async updateImportRow() {
        ensureAvailable(state);
        return {
          row: {
            id: "demo-row",
            rowNo: 1,
            sourceRowId: "1",
            sourceTaskId: "demo-ege-7-graph",
            status: "ready",
            errorCode: null,
            errorMessage: null,
            payload: {},
            normalizedTask: null,
            evidence: [],
            appliedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
      },
      async applyImport() {
        ensureAvailable(state);
        return this.createImport(undefined, { sourceType: "upload" });
      },
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
        return demoTeacherPlan(studentId);
      },
      async updateStudentPlan(_ctx: ServiceContext | undefined, studentId: string, input?: UpdatePlanInput) {
        ensureAvailable(state);
        const current = demoTeacherPlan(studentId);
        return {
          ...current,
          draft_plan: current.draft_plan
            ? {
                ...current.draft_plan,
                title: input?.title ?? current.draft_plan.title,
                strategy: input?.strategy ?? current.draft_plan.strategy,
                rationale: input?.rationale ?? current.draft_plan.rationale,
                goal_summary: input?.goalSummary ?? current.draft_plan.goal_summary,
                deadline:
                  input?.deadline === null
                    ? undefined
                    : input?.deadline ?? current.draft_plan.deadline,
                sessions_per_week:
                  input?.sessionsPerWeek === null
                    ? undefined
                    : input?.sessionsPerWeek ?? current.draft_plan.sessions_per_week,
                session_duration_minutes:
                  input?.sessionDurationMinutes === null
                    ? undefined
                    : input?.sessionDurationMinutes ?? current.draft_plan.session_duration_minutes,
                checkpoints: input?.checkpoints ?? current.draft_plan.checkpoints,
                lessons: input?.lessons?.map((lesson) => ({
                  id: lesson.id ?? `demo-draft-lesson-${lesson.lessonNo}`,
                  lesson_no: lesson.lessonNo,
                  planned_date: lesson.plannedDate,
                  title: lesson.title,
                  lesson_goal: lesson.lessonGoal,
                  topics: lesson.topics ?? [],
                  task_numbers: lesson.taskNumbers ?? [],
                  prototype_ids: lesson.prototypeIds ?? [],
                  skill_atoms: lesson.skillAtoms ?? [],
                  status: lesson.status ?? "planned",
                  student_summary: lesson.studentSummary,
                  teacher_notes: lesson.teacherNotes
                })) ?? current.draft_plan.lessons
              }
            : null
        };
      },
      async publishStudentPlan(_ctx: ServiceContext | undefined, studentId: string) {
        ensureAvailable(state);
        const current = demoTeacherPlan(studentId);
        return {
          plan: current.draft_plan
            ? {
                ...current.draft_plan,
                status: "active" as const
              }
            : { ...demoPlan, student_id: studentId }
        };
      },
      async getStudentPlanHistory(_ctx: ServiceContext | undefined, studentId: string): Promise<PlanHistoryResponse> {
        ensureAvailable(state);
        return demoPlanHistoryResponse(studentId);
      },
      async previewStudentPlanFeedback(_ctx: ServiceContext | undefined, studentId: string) {
        ensureAvailable(state);
        return demoFeedbackPreview(`demo-plan-v2-draft-${studentId}`);
      },
      async applyStudentPlanAdjustment(_ctx: ServiceContext | undefined, studentId: string, adjustmentId: string) {
        ensureAvailable(state);
        return demoFeedbackPreview(`demo-plan-v2-draft-${studentId}`, demoPlanAdjustments.map((adjustment) => ({
          ...adjustment,
          id: adjustmentId,
          status: "applied"
        })));
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
      async getStudentAnalytics(_ctx: ServiceContext | undefined, _studentId: string): Promise<TeacherAnalyticsResponse> {
        ensureAvailable(state);
        return { analytics: demoAnalytics };
      },
      async getTaskBank(_ctx?: ServiceContext, _query?: Record<string, unknown>) {
        ensureAvailable(state);
        return {
          tasks: demoTasks.map(serializeTeacherTask),
          page: 1,
          pageSize: 20,
          total: demoTasks.length,
          totalPages: 1,
          sortBy: "updatedAt",
          sortOrder: "desc"
        };
      },
      async getTask(_ctx: ServiceContext | undefined, taskId: string) {
        ensureAvailable(state);
        return { task: serializeTeacherTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async updateTask(_ctx: ServiceContext | undefined, taskId: string, _input?: Record<string, unknown>) {
        ensureAvailable(state);
        return { task: serializeTeacherTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async deleteTask(_ctx: ServiceContext | undefined, taskId: string) {
        ensureAvailable(state);
        return { task: serializeTeacherTask(demoTasks.find((task) => task.task_id === taskId || task.id === taskId) || demoTasks[0]) };
      },
      async bulkTasks() {
        ensureAvailable(state);
        return { updated: 0, archived: 0, deleted: 0, tasks: [] };
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
