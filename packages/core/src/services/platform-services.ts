import { checkShortAnswer } from "../answer-checking";
import {
  ServiceConflictError,
  ServiceForbiddenError,
  SetupRequiredError
} from "./errors";
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
  AssignmentSummary,
  CreateAssignmentInput,
  CreateScheduleEventInput,
  PlanAdjustmentSummary,
  PlanHistoryResponse,
  RawTask,
  ReviewAttemptInput,
  ServiceContext,
  ServiceUser,
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

type DemoAssignmentRecord = AssignmentSummary & {
  studentId: string;
  taskIds: string[];
};

type DemoAttemptRecord = {
  id: string;
  assignmentId?: string;
  taskId: string;
  studentId: string;
  answer: string;
  status: "checked" | "pending_review";
  isCorrect?: boolean;
  timeSpentSec?: number;
  scoreAwarded?: number;
  feedbackMd?: string;
  mistakeTags: string[];
};

type DemoPlanState = {
  draft: TeacherPlanResponse["draft_plan"];
  active: TeacherPlanResponse["active_plan"];
  history: PlanHistoryResponse["history"];
  events: PlanHistoryResponse["change_events"];
  adjustments: PlanAdjustmentSummary[];
};

type DemoAccessRequest = {
  id: string;
  subjectId: string;
  requesterEmail: string;
  requesterName: string | null;
  requestedRole: Exclude<ServiceUser["role"], "guest"> | null;
  status: "pending" | "approved" | "rejected";
  decisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  linkedUserId: string | null;
  currentRole: ServiceUser["role"] | null;
  blocked: boolean;
  studentId: string | null;
  studentPublicCode: string | null;
  learningTrack: string | null;
};

type DemoManagedUser = {
  userId: string;
  clerkSubject: string | null;
  email: string;
  displayName: string | null;
  role: Exclude<ServiceUser["role"], "guest">;
  isActive: boolean;
  blockedAt: string | null;
  blockReason: string | null;
  studentId: string | null;
  studentPublicCode: string | null;
  learningTrack: string | null;
  createdAt: string;
  updatedAt: string;
};

type DemoAccessEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorUserId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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

function createDemoPlanState(studentId: string): DemoPlanState {
  const initial = demoTeacherPlan(studentId);
  return {
    draft: clone(initial.draft_plan),
    active: clone(initial.active_plan),
    history: clone(demoPlanHistoryResponse(studentId).history),
    events: clone(initial.recent_events),
    adjustments: clone(initial.pending_adjustments)
  };
}

export function createPlatformServices(options: ServiceOptions) {
  const { state } = options;
  const reviewTask: RawTask = {
    ...clone(demoTasks[0]),
    id: "demo-review-task",
    task_id: "demo-review-task",
    title: "Задача с ручной проверкой",
    statement_md: "Опишите ход решения задачи своими словами.",
    answer_json: undefined,
    solution_md: "Преподаватель проверяет обоснование вручную.",
    teacher_notes: "Проверить полноту аргументации."
  };
  const tasks = [...clone(demoTasks), reviewTask];
  const assignments: DemoAssignmentRecord[] = demoAssignments.map((assignment) => ({
    ...clone(assignment),
    studentId: "demo-student",
    taskIds: [demoTasks[0].id]
  }));
  const attempts: DemoAttemptRecord[] = [];
  const plans = new Map<string, DemoPlanState>();
  let nextSequence = 1;
  const initializedAt = new Date().toISOString();
  const accessRequests: DemoAccessRequest[] = [
    {
      id: "demo-request-student",
      subjectId: "demo-pending-student",
      requesterEmail: "pending.student@example.com",
      requesterName: "Pending Student",
      requestedRole: "student",
      status: "pending",
      decisionReason: null,
      reviewedAt: null,
      createdAt: initializedAt,
      updatedAt: initializedAt,
      lastSeenAt: initializedAt,
      linkedUserId: null,
      currentRole: null,
      blocked: false,
      studentId: null,
      studentPublicCode: null,
      learningTrack: null
    },
    {
      id: "demo-request-reject",
      subjectId: "demo-pending-reject",
      requesterEmail: "pending.reject@example.com",
      requesterName: "Pending Rejection",
      requestedRole: "teacher",
      status: "pending",
      decisionReason: null,
      reviewedAt: null,
      createdAt: initializedAt,
      updatedAt: initializedAt,
      lastSeenAt: initializedAt,
      linkedUserId: null,
      currentRole: null,
      blocked: false,
      studentId: null,
      studentPublicCode: null,
      learningTrack: null
    }
  ];
  const managedUsers: DemoManagedUser[] = [
    {
      userId: "demo-owner-user",
      clerkSubject: "demo-owner",
      email: "owner@example.com",
      displayName: "Demo Owner",
      role: "owner",
      isActive: true,
      blockedAt: null,
      blockReason: null,
      studentId: null,
      studentPublicCode: null,
      learningTrack: null,
      createdAt: initializedAt,
      updatedAt: initializedAt
    },
    {
      userId: "demo-teacher-user",
      clerkSubject: "demo-teacher",
      email: "teacher@example.com",
      displayName: "Demo Teacher",
      role: "teacher",
      isActive: true,
      blockedAt: null,
      blockReason: null,
      studentId: null,
      studentPublicCode: null,
      learningTrack: null,
      createdAt: initializedAt,
      updatedAt: initializedAt
    }
  ];
  const accessEvents: DemoAccessEvent[] = [];

  const nextId = (prefix: string) => `${prefix}-${nextSequence++}`;
  const getPlanState = (studentId: string) => {
    const current = plans.get(studentId);
    if (current) return current;
    const initial = createDemoPlanState(studentId);
    plans.set(studentId, initial);
    return initial;
  };

  const findTask = (taskId: string) =>
    tasks.find((task) => task.task_id === taskId || task.id === taskId);

  const requireAssignment = (assignmentId: string) => {
    const assignment = assignments.find((row) => row.id === assignmentId);
    if (!assignment) {
      throw new ServiceForbiddenError("Assignment is not available");
    }
    return assignment;
  };

  const requireAccessRequest = (requestIdOrSubject: string) => {
    const accessRequest = accessRequests.find(
      (request) =>
        request.id === requestIdOrSubject ||
        request.subjectId === requestIdOrSubject
    );
    if (!accessRequest) {
      throw new ServiceForbiddenError("Access request is not available");
    }
    return accessRequest;
  };

  const requireManagedUser = (userId: string) => {
    const user = managedUsers.find((candidate) => candidate.userId === userId);
    if (!user) throw new ServiceForbiddenError("User is not available");
    return user;
  };

  const ownerConfirmationPhrase = (user: DemoManagedUser) =>
    `CONFIRM OWNER ${user.email}`;

  const accessStatusFor = (
    subjectId: string,
    request: DemoAccessRequest | undefined,
    user: DemoManagedUser | undefined
  ) => ({
    state: user
      ? user.isActive
        ? ("active" as const)
        : ("blocked" as const)
      : request?.status ?? ("missing" as const),
    subjectId,
    requestStatus: request?.status ?? null,
    requestedRole: request?.requestedRole ?? null,
    currentRole: user?.role ?? request?.currentRole ?? null,
    reason: user?.blockReason ?? request?.decisionReason ?? null,
    reviewedAt: request?.reviewedAt ?? null,
    lastSeenAt: request?.lastSeenAt ?? null
  });

  const recordAccessEvent = (
    ctx: ServiceContext,
    action: string,
    entityType: string,
    entityId: string,
    reason: string
  ) => {
    accessEvents.unshift({
      id: nextId("demo-access-event"),
      action,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      metadata: { reason }
    });
  };

  const accessStatusForContext = (ctx: ServiceContext) => {
    const user = managedUsers.find(
      (candidate) => candidate.clerkSubject === ctx.user.id
    );
    let accessRequest = accessRequests.find(
      (request) => request.subjectId === ctx.user.id
    );
    if (!user && ctx.user.role === "guest") {
      const seenAt = new Date().toISOString();
      if (!accessRequest) {
        accessRequest = {
          id: nextId("demo-access-request"),
          subjectId: ctx.user.id,
          requesterEmail: ctx.user.email,
          requesterName: ctx.user.name ?? null,
          requestedRole: null,
          status: "pending",
          decisionReason: null,
          reviewedAt: null,
          createdAt: seenAt,
          updatedAt: seenAt,
          lastSeenAt: seenAt,
          linkedUserId: null,
          currentRole: null,
          blocked: false,
          studentId: null,
          studentPublicCode: null,
          learningTrack: null
        };
        accessRequests.unshift(accessRequest);
      } else {
        accessRequest.requesterEmail = ctx.user.email;
        accessRequest.requesterName = ctx.user.name ?? null;
        accessRequest.lastSeenAt = seenAt;
        accessRequest.updatedAt = seenAt;
      }
    }
    return accessStatusFor(ctx.user.id, accessRequest, user);
  };

  return {
    common: {
      async getMe(ctx: ServiceContext) {
        return {
          user: ctx.user,
          accessStatus: accessStatusForContext(ctx)
        };
      },
      async getAccessStatus(ctx: ServiceContext) {
        return { accessStatus: accessStatusForContext(ctx) };
      }
    },
    student: {
      async getDashboard(ctx?: ServiceContext) {
        ensureAvailable(state);
        const studentId = ctx?.user.role === "student" ? ctx.user.id : "demo-student";
        return {
          assignments: assignments
            .filter(
              (assignment) =>
                assignment.studentId === studentId &&
                ["assigned", "submitted", "reviewed"].includes(assignment.status)
            )
            .map(({ studentId: _studentId, taskIds: _taskIds, ...assignment }) =>
              clone(assignment)
            ),
          progress: demoProgress,
          schedule: demoSchedule.slice(0, 1)
        };
      },
      async getSchedule(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return { events: demoSchedule };
      },
      async getPlan(ctx?: ServiceContext) {
        ensureAvailable(state);
        const studentId = ctx?.user.role === "student" ? ctx.user.id : "demo-student";
        const activePlan = getPlanState(studentId).active;
        if (!activePlan) return { plan: null };
        const {
          student_id: _studentId,
          rationale: _rationale,
          change_summary: _changeSummary,
          ...studentPlan
        } = activePlan;
        return {
          plan: {
            ...clone(studentPlan),
            lessons: activePlan.lessons.map((lesson) => ({
              ...lesson,
              teacher_notes: undefined
            }))
          }
        };
      },
      async getAssignments(ctx?: ServiceContext) {
        ensureAvailable(state);
        const studentId = ctx?.user.role === "student" ? ctx.user.id : "demo-student";
        return {
          assignments: assignments
            .filter(
              (assignment) =>
                assignment.studentId === studentId &&
                ["assigned", "submitted", "reviewed"].includes(assignment.status)
            )
            .map(({ studentId: _studentId, taskIds: _taskIds, ...assignment }) =>
              clone(assignment)
            )
        };
      },
      async getAssignment(ctx: ServiceContext | undefined, assignmentId: string) {
        ensureAvailable(state);
        const studentId = ctx?.user.role === "student" ? ctx.user.id : "demo-student";
        const record = requireAssignment(assignmentId);
        if (
          record.studentId !== studentId ||
          !["assigned", "submitted", "reviewed"].includes(record.status)
        ) {
          throw new ServiceForbiddenError("Assignment is not available for this student");
        }
        const { studentId: _studentId, taskIds, ...assignment } = record;
        return {
          assignment: clone(assignment),
          tasks: taskIds
            .map((taskId) => findTask(taskId))
            .filter((task): task is RawTask => Boolean(task))
            .map(serializeStudentTask)
        };
      },
      async getTask(ctx: ServiceContext | undefined, taskId: string) {
        ensureAvailable(state);
        const studentId = ctx?.user.role === "student" ? ctx.user.id : "demo-student";
        const task = findTask(taskId);
        const isAssigned = assignments.some(
          (assignment) =>
            assignment.studentId === studentId &&
            ["assigned", "submitted", "reviewed"].includes(assignment.status) &&
            assignment.taskIds.some(
              (assignedTaskId) =>
                assignedTaskId === taskId ||
                findTask(assignedTaskId)?.id === task?.id
            )
        );
        if (!task || !isAssigned) {
          throw new ServiceForbiddenError("Task is not assigned to this student");
        }
        return { task: serializeStudentTask(task) };
      },
      async submitAttempt(
        ctxOrInput: ServiceContext | SubmitAttemptInput | undefined,
        maybeInput?: SubmitAttemptInput
      ): Promise<AttemptResult> {
        ensureAvailable(state);
        const input = maybeInput ?? (ctxOrInput as SubmitAttemptInput);
        const context = maybeInput ? (ctxOrInput as ServiceContext) : undefined;
        const studentId =
          context?.user.role === "student" ? context.user.id : "demo-student";
        const task = findTask(input.taskId);
        if (!task) {
          throw new ServiceForbiddenError("Task is not assigned to this student");
        }
        if (input.assignmentId) {
          const assignment = requireAssignment(input.assignmentId);
          if (
            assignment.studentId !== studentId ||
            !["assigned", "submitted", "reviewed"].includes(assignment.status) ||
            !assignment.taskIds.some(
              (taskId) => taskId === task.id || taskId === task.task_id
            )
          ) {
            throw new ServiceForbiddenError("Task is not assigned to this student");
          }
        }
        const expected = (task.answer_json as { answers?: string[] } | undefined)?.answers || [];
        const result = expected.length > 0 ? checkShortAnswer(expected, input.answer) : undefined;
        const attemptId = nextId("demo-attempt");
        attempts.push({
          id: attemptId,
          assignmentId: input.assignmentId,
          taskId: task.id,
          studentId,
          answer: input.answer,
          status: result ? "checked" : "pending_review",
          isCorrect: result?.correct,
          timeSpentSec: input.timeSpentSec,
          mistakeTags: []
        });
        return {
          attemptId,
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
        const planState = getPlanState(studentId);
        return {
          draft_plan: clone(planState.draft),
          active_plan: clone(planState.active),
          pending_adjustments: clone(planState.adjustments),
          recent_events: clone(planState.events)
        };
      },
      async updateStudentPlan(_ctx: ServiceContext | undefined, studentId: string, input?: UpdatePlanInput) {
        ensureAvailable(state);
        const planState = getPlanState(studentId);
        const current = planState.draft;
        if (!current) {
          throw new ServiceForbiddenError("Draft plan is not available");
        }
        planState.draft = {
          ...current,
          title: input?.title ?? current.title,
          strategy: input?.strategy ?? current.strategy,
          rationale: input?.rationale ?? current.rationale,
          goal_summary: input?.goalSummary ?? current.goal_summary,
          deadline:
            input?.deadline === null
              ? undefined
              : input?.deadline ?? current.deadline,
          sessions_per_week:
            input?.sessionsPerWeek === null
              ? undefined
              : input?.sessionsPerWeek ?? current.sessions_per_week,
          session_duration_minutes:
            input?.sessionDurationMinutes === null
              ? undefined
              : input?.sessionDurationMinutes ?? current.session_duration_minutes,
          checkpoints: input?.checkpoints ?? current.checkpoints,
          change_summary: input?.changeSummary ?? current.change_summary,
          lessons:
            input?.lessons?.map((lesson) => ({
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
            })) ?? current.lessons
        };
        planState.events.unshift({
          id: nextId("demo-plan-event"),
          plan_id: planState.draft.id,
          event_type: "updated",
          status: "recorded",
          summary: input?.changeSummary ?? "Черновик плана обновлён.",
          created_at: new Date().toISOString()
        });
        return {
          draft_plan: clone(planState.draft),
          active_plan: clone(planState.active),
          pending_adjustments: clone(planState.adjustments),
          recent_events: clone(planState.events)
        };
      },
      async publishStudentPlan(_ctx: ServiceContext | undefined, studentId: string) {
        ensureAvailable(state);
        const planState = getPlanState(studentId);
        if (!planState.draft) {
          throw new ServiceForbiddenError("Draft plan is not available");
        }
        const publishedAt = new Date().toISOString();
        const previousActive = planState.active
          ? {
              ...clone(planState.active),
              status: "superseded" as const,
              superseded_at: publishedAt
            }
          : null;
        const published = {
          ...clone(planState.draft),
          status: "active" as const,
          published_at: publishedAt
        };
        planState.active = published;
        planState.history = [
          published,
          ...planState.history.map((plan) =>
            previousActive && plan.id === previousActive.id
              ? previousActive
              : plan
          )
        ];
        planState.events.unshift({
          id: nextId("demo-plan-event"),
          plan_id: published.id,
          event_type: "applied",
          status: "applied",
          summary: `Опубликована версия v${published.version_no}.`,
          created_at: publishedAt,
          applied_at: publishedAt
        });
        planState.draft = {
          ...clone(published),
          id: nextId("demo-plan-draft"),
          version_no: published.version_no + 1,
          status: "draft",
          published_at: undefined,
          superseded_at: undefined,
          change_summary: "Новый черновик после публикации."
        };
        return { plan: clone(published) };
      },
      async getStudentPlanHistory(_ctx: ServiceContext | undefined, studentId: string): Promise<PlanHistoryResponse> {
        ensureAvailable(state);
        const planState = getPlanState(studentId);
        return {
          history: clone(planState.history),
          change_events: clone(planState.events)
        };
      },
      async previewStudentPlanFeedback(_ctx: ServiceContext | undefined, studentId: string) {
        ensureAvailable(state);
        const planState = getPlanState(studentId);
        return demoFeedbackPreview(
          planState.draft?.id ?? planState.active?.id ?? `demo-plan-${studentId}`,
          planState.adjustments
        );
      },
      async applyStudentPlanAdjustment(_ctx: ServiceContext | undefined, studentId: string, adjustmentId: string) {
        ensureAvailable(state);
        const planState = getPlanState(studentId);
        const adjustment = planState.adjustments.find(
          (proposal) => proposal.id === adjustmentId
        );
        if (!adjustment) {
          throw new ServiceForbiddenError("Plan adjustment is not available");
        }
        adjustment.status = "applied";
        adjustment.applied_at = new Date().toISOString();
        planState.events.unshift({
          id: nextId("demo-plan-event"),
          plan_id: adjustment.plan_id,
          event_type: "applied",
          status: "applied",
          summary: `Применена корректировка: ${adjustment.title}`,
          created_at: adjustment.applied_at,
          applied_at: adjustment.applied_at
        });
        return demoFeedbackPreview(
          planState.draft?.id ?? planState.active?.id ?? `demo-plan-${studentId}`,
          planState.adjustments
        );
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
          tasks: tasks.map(serializeTeacherTask),
          page: 1,
          pageSize: 20,
          total: tasks.length,
          totalPages: 1,
          sortBy: "updatedAt",
          sortOrder: "desc"
        };
      },
      async getTask(_ctx: ServiceContext | undefined, taskId: string) {
        ensureAvailable(state);
        const task = findTask(taskId);
        if (!task) throw new ServiceForbiddenError("Task is not available");
        return { task: serializeTeacherTask(task) };
      },
      async updateTask(_ctx: ServiceContext | undefined, taskId: string, input?: Record<string, unknown>) {
        ensureAvailable(state);
        const task = findTask(taskId);
        if (!task) throw new ServiceForbiddenError("Task is not available");
        const patch = input ?? {};
        Object.assign(task, {
          topic: patch.topic ?? task.topic,
          task_number: patch.taskNumber ?? task.task_number,
          difficulty_level: patch.difficultyLevel ?? task.difficulty_level,
          statement_md: patch.statementMd ?? task.statement_md,
          answer_json: patch.answerJson ?? task.answer_json,
          solution_md: patch.solutionMd ?? task.solution_md,
          verification_status:
            patch.verificationStatus ?? task.verification_status,
          license_status: patch.licenseStatus ?? task.license_status,
          status: patch.status ?? task.status,
          skill_atoms: patch.skillAtoms ?? task.skill_atoms,
          source_name: patch.sourceName ?? task.source_name,
          source_url: patch.sourceUrl ?? task.source_url
        });
        return { task: serializeTeacherTask(task) };
      },
      async deleteTask(
        _ctx: ServiceContext | undefined,
        taskId: string,
        mode: "delete" | "archive" = "delete"
      ) {
        ensureAvailable(state);
        const task = findTask(taskId);
        if (!task) throw new ServiceForbiddenError("Task is not available");
        const isReferenced = assignments.some((assignment) =>
          assignment.taskIds.some(
            (assignedTaskId) =>
              assignedTaskId === task.id || assignedTaskId === task.task_id
          )
        );
        if (mode === "delete" && isReferenced) {
          throw new ServiceConflictError(
            "Task is referenced by an assignment; archive it instead"
          );
        }
        if (mode === "archive") {
          task.status = "archived";
          return { task: serializeTeacherTask(task) };
        }
        tasks.splice(tasks.indexOf(task), 1);
        return { task: serializeTeacherTask(task) };
      },
      async bulkTasks(
        _ctx?: ServiceContext,
        input?: {
          action?: "archive" | "delete" | "activate" | "mark_needs_review";
          taskIds?: string[];
          patch?: Record<string, unknown>;
        }
      ) {
        ensureAvailable(state);
        const selected = (input?.taskIds ?? [])
          .map((taskId) => findTask(taskId))
          .filter((task): task is RawTask => Boolean(task));
        if (input?.action === "archive") {
          for (const task of selected) task.status = "archived";
          return {
            updated: 0,
            archived: selected.length,
            deleted: 0,
            tasks: selected.map(serializeTeacherTask)
          };
        }
        if (
          input?.action === "activate" ||
          input?.action === "mark_needs_review"
        ) {
          for (const task of selected) {
            task.status =
              input.action === "activate" ? "active" : "needs_review";
          }
          return {
            updated: selected.length,
            archived: 0,
            deleted: 0,
            tasks: selected.map(serializeTeacherTask)
          };
        }
        let deleted = 0;
        for (const task of selected) {
          if (
            !assignments.some((assignment) =>
              assignment.taskIds.includes(task.id)
            )
          ) {
            tasks.splice(tasks.indexOf(task), 1);
            deleted += 1;
          }
        }
        return {
          updated: 0,
          archived: 0,
          deleted,
          tasks: selected.map(serializeTeacherTask)
        };
      },
      async getAssignments(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return {
          assignments: assignments.map(
            ({ studentId: _studentId, taskIds: _taskIds, ...assignment }) =>
              clone(assignment)
          )
        };
      },
      async getAssignment(_ctx: ServiceContext | undefined, assignmentId: string) {
        ensureAvailable(state);
        const record = requireAssignment(assignmentId);
        const { studentId: _studentId, taskIds, ...assignment } = record;
        return {
          assignment: clone(assignment),
          tasks: taskIds
            .map((taskId) => findTask(taskId))
            .filter((task): task is RawTask => Boolean(task))
            .map(serializeTeacherTask)
        };
      },
      async createAssignment(_ctx: ServiceContext | undefined, input?: CreateAssignmentInput) {
        ensureAvailable(state);
        if (!input) throw new ServiceForbiddenError("Assignment input is required");
        const assignment: DemoAssignmentRecord = {
          id: nextId("demo-assignment"),
          title: input.title,
          status: "draft",
          due_at: input.dueAt,
          studentId: input.studentId,
          taskIds: [...input.taskIds]
        };
        assignments.unshift(assignment);
        const { studentId: _studentId, taskIds: _taskIds, ...summary } = assignment;
        return { assignment: clone(summary) };
      },
      async updateAssignment(_ctx: ServiceContext | undefined, assignmentId: string, input?: UpdateAssignmentInput) {
        ensureAvailable(state);
        const assignment = requireAssignment(assignmentId);
        assignment.title = input?.title ?? assignment.title;
        assignment.due_at = input?.dueAt ?? assignment.due_at;
        assignment.status = input?.status ?? assignment.status;
        assignment.taskIds = input?.taskIds ?? assignment.taskIds;
        const { studentId: _studentId, taskIds: _taskIds, ...summary } = assignment;
        return { assignment: clone(summary) };
      },
      async publishAssignment(_ctx: ServiceContext | undefined, assignmentId: string) {
        ensureAvailable(state);
        const assignment = requireAssignment(assignmentId);
        assignment.status = "assigned";
        const { studentId: _studentId, taskIds: _taskIds, ...summary } = assignment;
        return { assignment: clone(summary) };
      },
      async getPendingReviewAttempts(_ctx?: ServiceContext) {
        ensureAvailable(state);
        return {
          attempts: attempts
            .filter((attempt) => attempt.status === "pending_review")
            .map((attempt) => clone(attempt))
        };
      },
      async reviewAttempt(
        ctxOrAttemptId: ServiceContext | string | undefined,
        maybeAttemptId?: string,
        _input?: ReviewAttemptInput
      ) {
        ensureAvailable(state);
        const attemptId = typeof ctxOrAttemptId === "string" ? ctxOrAttemptId : maybeAttemptId;
        const attempt = attempts.find((row) => row.id === attemptId);
        if (!attempt) throw new ServiceForbiddenError("Attempt is not available");
        attempt.status = "checked";
        attempt.isCorrect = _input?.isCorrect;
        attempt.scoreAwarded = _input?.scoreAwarded;
        attempt.feedbackMd = _input?.feedbackMd;
        attempt.mistakeTags = _input?.mistakeTags ?? [];
        return { attempt: clone(attempt) };
      }
    },
    owner: {
      async getAccessStatus(ctx?: ServiceContext) {
        if (!ctx) {
          return {
            accessStatus: accessStatusFor("", undefined, undefined)
          };
        }
        return { accessStatus: accessStatusForContext(ctx) };
      },
      async listAccess(
        _ctx?: ServiceContext,
        filters: {
          q?: string;
          status?: "pending" | "approved" | "rejected";
          role?: Exclude<ServiceUser["role"], "guest">;
          active?: "all" | "active" | "blocked";
        } = {}
      ) {
        ensureAvailable(state);
        const query = filters.q?.toLocaleLowerCase();
        return {
          requests: accessRequests
            .filter(
              (request) =>
                (!filters.status || request.status === filters.status) &&
                (!filters.role || request.requestedRole === filters.role) &&
                (!query ||
                  [
                    request.requesterEmail,
                    request.requesterName,
                    request.subjectId
                  ]
                    .filter(Boolean)
                    .some((value) =>
                      String(value).toLocaleLowerCase().includes(query)
                    ))
            )
            .map(clone),
          users: managedUsers
            .filter(
              (user) =>
                (!filters.role || user.role === filters.role) &&
                (filters.active === "active"
                  ? user.isActive
                  : filters.active === "blocked"
                    ? !user.isActive
                    : true) &&
                (!query ||
                  [user.email, user.displayName, user.clerkSubject, user.userId]
                    .filter(Boolean)
                    .some((value) =>
                      String(value).toLocaleLowerCase().includes(query)
                    ))
            )
            .map(clone)
        };
      },
      async getAccessRequest(
        _ctx: ServiceContext | undefined,
        subjectId: string
      ) {
        ensureAvailable(state);
        const request = requireAccessRequest(subjectId);
        const user = request.linkedUserId
          ? managedUsers.find(
              (candidate) => candidate.userId === request.linkedUserId
            )
          : undefined;
        return {
          request: clone(request),
          user: user ? clone(user) : null,
          history: accessEvents
            .filter(
              (event) =>
                event.entityId === request.id ||
                event.entityId === request.linkedUserId
            )
            .map(clone),
          accessStatus: accessStatusFor(request.subjectId, request, user),
          ownerConfirmationPhrase:
            user && user.role !== "owner"
              ? ownerConfirmationPhrase(user)
              : null
        };
      },
      async getUserAccess(_ctx: ServiceContext | undefined, userId: string) {
        ensureAvailable(state);
        const user = requireManagedUser(userId);
        const request = accessRequests.find(
          (candidate) => candidate.linkedUserId === user.userId
        );
        return {
          user: clone(user),
          history: accessEvents
            .filter((event) => event.entityId === user.userId)
            .map(clone),
          accessStatus: accessStatusFor(
            user.clerkSubject ?? user.userId,
            request,
            user
          ),
          ownerConfirmationPhrase:
            user.role !== "owner" ? ownerConfirmationPhrase(user) : null
        };
      },
      async approveAccessRequest(
        ctx: ServiceContext,
        requestId: string,
        input: {
          role: Exclude<ServiceUser["role"], "guest">;
          reason: string;
          ownerConfirmation?: string;
        }
      ) {
        ensureAvailable(state);
        const request = requireAccessRequest(requestId);
        if (request.status !== "pending") {
          throw new ServiceConflictError("Access request has already been reviewed");
        }
        const now = new Date().toISOString();
        const user: DemoManagedUser = {
          userId: nextId("demo-user"),
          clerkSubject: request.subjectId,
          email: request.requesterEmail,
          displayName: request.requesterName,
          role: input.role,
          isActive: true,
          blockedAt: null,
          blockReason: null,
          studentId: input.role === "student" ? nextId("demo-student") : null,
          studentPublicCode:
            input.role === "student"
              ? `STUDENT-${nextSequence.toString().padStart(4, "0")}`
              : null,
          learningTrack: input.role === "student" ? "ege_informatics" : null,
          createdAt: now,
          updatedAt: now
        };
        if (
          input.role === "owner" &&
          input.ownerConfirmation !== ownerConfirmationPhrase(user)
        ) {
          throw new ServiceForbiddenError(
            "Owner confirmation phrase is required"
          );
        }
        managedUsers.push(user);
        request.status = "approved";
        request.decisionReason = input.reason;
        request.reviewedAt = now;
        request.updatedAt = now;
        request.linkedUserId = user.userId;
        request.currentRole = user.role;
        request.studentId = user.studentId;
        request.studentPublicCode = user.studentPublicCode;
        request.learningTrack = user.learningTrack;
        recordAccessEvent(ctx, "approved", "access_request", request.id, input.reason);
        return this.getAccessRequest(ctx, request.subjectId);
      },
      async rejectAccessRequest(
        ctx: ServiceContext,
        requestId: string,
        input: { reason: string }
      ) {
        ensureAvailable(state);
        const request = requireAccessRequest(requestId);
        if (request.status !== "pending") {
          throw new ServiceConflictError("Access request has already been reviewed");
        }
        const now = new Date().toISOString();
        request.status = "rejected";
        request.decisionReason = input.reason;
        request.reviewedAt = now;
        request.updatedAt = now;
        recordAccessEvent(ctx, "rejected", "access_request", request.id, input.reason);
        return this.getAccessRequest(ctx, request.subjectId);
      },
      async updateUserAccess(
        ctx: ServiceContext,
        userId: string,
        input: {
          role?: Exclude<ServiceUser["role"], "guest">;
          isActive?: boolean;
          reason: string;
          ownerConfirmation?: string;
        }
      ) {
        ensureAvailable(state);
        const user = requireManagedUser(userId);
        const removesOwner =
          user.role === "owner" &&
          (input.isActive === false ||
            (input.role !== undefined && input.role !== "owner"));
        const activeOwnerCount = managedUsers.filter(
          (candidate) => candidate.role === "owner" && candidate.isActive
        ).length;
        if (removesOwner && activeOwnerCount <= 1) {
          throw new ServiceConflictError(
            "The last active owner cannot be blocked or demoted"
          );
        }
        if (
          input.role === "owner" &&
          user.role !== "owner" &&
          input.ownerConfirmation !== ownerConfirmationPhrase(user)
        ) {
          throw new ServiceForbiddenError(
            "Owner confirmation phrase is required"
          );
        }
        const now = new Date().toISOString();
        if (input.role) user.role = input.role;
        if (input.isActive !== undefined) {
          user.isActive = input.isActive;
          user.blockedAt = input.isActive ? null : now;
          user.blockReason = input.isActive ? null : input.reason;
        }
        user.updatedAt = now;
        const linkedRequest = accessRequests.find(
          (request) => request.linkedUserId === user.userId
        );
        if (linkedRequest) {
          linkedRequest.currentRole = user.role;
          linkedRequest.blocked = !user.isActive;
          linkedRequest.updatedAt = now;
        }
        recordAccessEvent(
          ctx,
          input.isActive === false
            ? "blocked"
            : input.isActive === true
              ? "restored"
              : "role_changed",
          "user",
          user.userId,
          input.reason
        );
        return {
          user: clone(user),
          accessStatus: accessStatusFor(
            user.clerkSubject ?? user.userId,
            linkedRequest,
            user
          ),
          ownerConfirmationPhrase:
            user.role !== "owner" ? ownerConfirmationPhrase(user) : null
        };
      }
    }
  };
}
