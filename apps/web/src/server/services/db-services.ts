import { and, asc, desc, eq, or } from "drizzle-orm";
import { getDb } from "@eduferma/db";
import {
  assignmentTasks,
  assignments,
  attempts,
  learningPlanLessons,
  learningPlans,
  lessons,
  mistakeEvents,
  planAdjustments,
  planChangeEvents,
  scheduleEvents,
  skillMastery,
  studentPrototypeMastery,
  students,
  tasks,
  teacherStudentLinks,
  users
} from "@eduferma/db";
import {
  type FeedbackPreviewSummary,
  type PlanAdjustmentSummary,
  type PlanHistoryResponse,
  type PlanSummary,
  SetupRequiredError,
  ServiceForbiddenError,
  serializeStudentTask,
  serializeTeacherTask
} from "@eduferma/core/services";
import type { OwnerAccessListQuery, ApproveAccessRequest, RejectAccessRequest, UpdateOwnerUserAccessRequest } from "@eduferma/validators";
import { checkShortAnswer, updateMastery } from "@eduferma/core";
import { createTeacherImportServices } from "@/server/imports/service";
import type {
  AttemptResult,
  CreateAssignmentInput,
  CreateScheduleEventInput,
  ReviewAttemptInput,
  ServiceContext,
  SubmitAttemptInput,
  UpdateAssignmentInput,
  UpdatePlanInput
} from "@eduferma/core/services";
import {
  mapDbAssignmentToSummary,
  mapDbLessonToScheduleEvent,
  mapDbPlanAdjustment,
  mapDbPlanChangeEvent,
  mapDbPlanToSummary,
  mapDbPrototypeMastery,
  mapDbScheduleEvent,
  mapDbSkillMastery,
  mapDbStudentToSummary,
  mapDbTaskToRawTask
} from "./db-mappers";
import {
  approveOwnerAccessRequest,
  getAccessStatusForUser,
  getOwnerAccessRequestDetail,
  getOwnerUserAccessDetail,
  listOwnerAccess,
  rejectOwnerAccessRequest,
  updateOwnerUserAccess
} from "@/server/owner-access/service";

type Db = ReturnType<typeof getDb>;
type Tx = any;
type DbUser = typeof users.$inferSelect;
type DbStudent = typeof students.$inferSelect;
type DbAssignment = typeof assignments.$inferSelect;
type DbTask = typeof tasks.$inferSelect;

const teacherRoles = new Set(["owner", "teacher", "tutor"]);

export function createDbPlatformServices() {
  const teacherImportServices = createTeacherImportServices(
    getDb(),
    requireTeacherDbUser,
    requireTaskByIdOrTaskId,
    mapDbTaskToRawTask,
    serializeTeacherTask
  );
  return {
    common: {
      async getMe(ctx: ServiceContext) {
        const accessStatus = await getAccessStatusForUser(ctx.user);
        if (ctx.user.role === "guest") {
          return { user: ctx.user, accessStatus };
        }

        const dbUser = await requireDbUser(ctx);
        return {
          user: {
            ...ctx.user,
            id: dbUser.authProviderUserId ?? dbUser.clerkUserId ?? ctx.user.id,
            dbUserId: dbUser.id,
            role: dbUser.role,
            name: dbUser.displayName ?? ctx.user.name
          },
          accessStatus
        };
      },
      async getAccessStatus(ctx: ServiceContext) {
        return { accessStatus: await getAccessStatusForUser(ctx.user) };
      }
    },
    student: {
      async getDashboard(ctx: ServiceContext) {
        const { db, student } = await requireStudentProfile(ctx);
        const [studentAssignments, progress, dbSchedule] = await Promise.all([
          getAssignmentsForStudent(db, student.id),
          getProgressForStudent(db, student.id),
          getScheduleForStudent(db, student.id)
        ]);

        return {
          assignments: studentAssignments,
          progress,
          schedule: dbSchedule.slice(0, 1)
        };
      },
      async getSchedule(ctx: ServiceContext) {
        const { db, student } = await requireStudentProfile(ctx);
        return { events: await getScheduleForStudent(db, student.id) };
      },
      async getPlan(ctx: ServiceContext) {
        const { db, student } = await requireStudentProfile(ctx);
        const plan = await getStudentSafePlanForStudent(db, student);
        return { plan };
      },
      async getAssignments(ctx: ServiceContext) {
        const { db, student } = await requireStudentProfile(ctx);
        return { assignments: await getAssignmentsForStudent(db, student.id) };
      },
      async getAssignment(ctx: ServiceContext, assignmentId: string) {
        const { db, student } = await requireStudentProfile(ctx);
        const assignment = await requireStudentAssignment(db, student.id, assignmentId);
        const taskRows = await getTasksForAssignment(db, assignment.id);

        return {
          assignment: mapDbAssignmentToSummary(assignment),
          tasks: taskRows.map(mapDbTaskToRawTask).map(serializeStudentTask)
        };
      },
      async getTask(ctx: ServiceContext, taskId: string) {
        const { db, student } = await requireStudentProfile(ctx);
        const task = await requireAssignedTaskForStudent(db, student.id, taskId);
        return { task: serializeStudentTask(mapDbTaskToRawTask(task)) };
      },
      async submitAttempt(ctx: ServiceContext, input: SubmitAttemptInput): Promise<AttemptResult> {
        const { db, student } = await requireStudentProfile(ctx);
        const assignment = await requireStudentAssignment(db, student.id, input.assignmentId ?? "");
        const task = await requireTaskByIdOrTaskId(db, input.taskId);
        const assignmentTask = await db.query.assignmentTasks.findFirst({
          where: (row) => and(eq(row.assignmentId, assignment.id), eq(row.taskId, task.id))
        });

        if (!assignmentTask) {
          throw new ServiceForbiddenError("Task is not assigned to this student");
        }

        const existingAttempts = await db.query.attempts.findMany({
          where: (row) => and(eq(row.studentId, student.id), eq(row.assignmentTaskId, assignmentTask.id))
        });
        const expected = (task.answerJson as { answers?: string[] } | null | undefined)?.answers ?? [];
        const result = expected.length > 0 ? checkShortAnswer(expected, input.answer) : undefined;
        const submittedAt = new Date();
        const startedAt = input.startedAt ? new Date(input.startedAt) : submittedAt;
        const checkStatus = result ? "checked" : "pending_review";
        const [attempt] = await db
          .insert(attempts)
          .values({
            assignmentTaskId: assignmentTask.id,
            assignmentId: assignment.id,
            taskId: task.id,
            studentId: student.id,
            attemptNo: existingAttempts.length + 1,
            submittedAnswer: input.answer,
            answerJson: { value: input.answer, timeSpentSec: input.timeSpentSec },
            timeSpentSec: input.timeSpentSec ?? 0,
            isCorrect: result?.correct,
            scoreAwarded: result?.correct ? 1 : result ? 0 : undefined,
            checkStatus,
            status: "submitted",
            startedAt,
            submittedAt,
            feedback: result?.correct ? "Верно." : undefined,
            feedbackMd: result?.correct ? "Верно." : undefined,
            mistakeTags: []
          })
          .returning();

        await db
          .update(assignments)
          .set({ status: "submitted", updatedAt: submittedAt })
          .where(eq(assignments.id, assignment.id));

        if (typeof result?.correct === "boolean") {
          await recordAttemptProgress(db, attempt, task, result.correct);
        }

        return {
          attemptId: attempt.id,
          checkStatus,
          isCorrect: result?.correct,
          feedback: result?.correct ? "Верно." : "Ответ принят, проверьте решение с преподавателем.",
          nextAllowedAction: result ? "continue" : "wait_review"
        };
      },
      async getProgress(ctx: ServiceContext) {
        const { db, student } = await requireStudentProfile(ctx);
        return { progress: await getProgressForStudent(db, student.id) };
      },
      async getAnalytics(ctx: ServiceContext) {
        const { db, student } = await requireStudentProfile(ctx);
        return { analytics: await getAnalyticsForStudent(db, student) };
      }
    },
    teacher: {
      ...teacherImportServices,
      async getDashboard(ctx: ServiceContext) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const [dbStudents, pendingAttempts, progress] = await Promise.all([
          getStudentsForTeacher(db, user),
          getPendingAttemptsForTeacher(db, user),
          db.query.skillMastery.findMany({ orderBy: (row, { desc }) => [desc(row.updatedAt)], limit: 8 })
        ]);

        return {
          students: dbStudents.map(mapDbStudentToSummary),
          pendingReview: pendingAttempts.length,
          progress: progress.map(mapDbSkillMastery)
        };
      },
      async getStudents(ctx: ServiceContext) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const dbStudents = await getStudentsForTeacher(db, user);
        return { students: dbStudents.map(mapDbStudentToSummary) };
      },
      async getStudent(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return { student: mapDbStudentToSummary(student) };
      },
      async getStudentPlan(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return getTeacherPlanPayload(db, student);
      },
      async updateStudentPlan(ctx: ServiceContext, studentId: string, input: UpdatePlanInput = {}) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        const draft = await db.transaction(async (tx) => {
          const editablePlan = await getOrCreateDraftPlan(tx, student, user.id);
          const nextPlanJson = mergePlanJson(editablePlan.planJson, input);

          const [plan] = await tx
            .update(learningPlans)
            .set({
              strategy: input.strategy ?? editablePlan.strategy,
              goalSummary: input.goalSummary ?? editablePlan.goalSummary ?? student.goalSummary,
              deadline:
                input.deadline === null
                  ? null
                  : input.deadline
                    ? new Date(input.deadline)
                    : editablePlan.deadline,
              sessionsPerWeek:
                input.sessionsPerWeek === null
                  ? null
                  : input.sessionsPerWeek ?? editablePlan.sessionsPerWeek,
              sessionDurationMinutes:
                input.sessionDurationMinutes === null
                  ? null
                  : input.sessionDurationMinutes ?? editablePlan.sessionDurationMinutes,
              rationale: input.rationale ?? editablePlan.rationale,
              changeSummary: input.changeSummary ?? editablePlan.changeSummary,
              planJson: nextPlanJson,
              updatedAt: new Date()
            })
            .where(eq(learningPlans.id, editablePlan.id))
            .returning();

          if (input.lessons) {
            await replacePlanLessons(tx, plan.id, input.lessons);
          }

          await recordPlanEvent(tx, {
            planId: plan.id,
            studentId: student.id,
            actorUserId: user.id,
            eventType: editablePlan.versionNo === 0 ? "created" : "updated",
            status: "recorded",
            summary: input.changeSummary ?? "Draft plan updated"
          });

          return plan;
        });
        const lessonsForDraft = await db.query.learningPlanLessons.findMany({
          where: (row) => eq(row.planId, draft.id),
          orderBy: (row, { asc }) => [asc(row.lessonNo)]
        });
        const teacherPlan = await getTeacherPlanPayload(db, student);
        return {
          ...teacherPlan,
          draft_plan: mapDbPlanToSummary(draft, student, lessonsForDraft)
        };
      },
      async publishStudentPlan(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        const plan = await db.transaction(async (tx) => {
          const current = await getTeacherPlanState(tx, student.id);
          if (!current.draftPlan) {
            throw new SetupRequiredError("Draft plan was not found for publish");
          }

          const now = new Date();
          if (current.activePlan) {
            await tx
              .update(learningPlans)
              .set({
                versionStatus: "superseded",
                isLatest: false,
                supersededAt: now,
                updatedAt: now
              })
              .where(eq(learningPlans.id, current.activePlan.id));
            await recordPlanEvent(tx, {
              planId: current.activePlan.id,
              studentId: student.id,
              actorUserId: user.id,
              eventType: "superseded",
              status: "recorded",
              summary: `Superseded by version ${current.draftPlan.versionNo}`
            });
          }

          const [published] = await tx
            .update(learningPlans)
            .set({
              status: "active",
              versionStatus: "active",
              isLatest: true,
              publishedAt: now,
              publishedByUserId: user.id,
              updatedAt: now
            })
            .where(eq(learningPlans.id, current.draftPlan.id))
            .returning();

          await tx
            .update(planAdjustments)
            .set({
              status: "rejected",
              reviewedByUserId: user.id,
              reviewedAt: now,
              updatedAt: now
            })
            .where(and(eq(planAdjustments.planId, published.id), eq(planAdjustments.status, "proposed")));

          await recordPlanEvent(tx, {
            planId: published.id,
            studentId: student.id,
            actorUserId: user.id,
            eventType: "approved",
            status: "approved",
            summary: `Published plan version ${published.versionNo}`,
            approvedAt: now
          });

          return published;
        });
        const lessonRows = await db.query.learningPlanLessons.findMany({
          where: (row) => eq(row.planId, plan.id),
          orderBy: (row, { asc }) => [asc(row.lessonNo)]
        });
        return { plan: mapDbPlanToSummary(plan, student, lessonRows) };
      },
      async getStudentPlanHistory(ctx: ServiceContext, studentId: string): Promise<PlanHistoryResponse> {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return getPlanHistoryPayload(db, student);
      },
      async previewStudentPlanFeedback(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return {
          preview: await db.transaction(async (tx) => previewPlanFeedback(tx, student, user.id))
        };
      },
      async applyStudentPlanAdjustment(ctx: ServiceContext, studentId: string, adjustmentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return {
          preview: await db.transaction(async (tx) => applyPlanAdjustment(tx, student, user.id, adjustmentId))
        };
      },
      async getStudentSchedule(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return { events: await getScheduleForStudent(db, student.id) };
      },
      async createStudentScheduleEvent(ctx: ServiceContext, studentId: string, input: CreateScheduleEventInput) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
        const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
        const [event] = await db
          .insert(scheduleEvents)
          .values({
            studentId: student.id,
            title: input.title,
            startsAt,
            endsAt,
            status: "planned"
          })
          .returning();

        return { event: mapDbScheduleEvent(event) };
      },
      async getStudentAssignments(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return { assignments: await getAssignmentsForStudent(db, student.id) };
      },
      async getStudentAnalytics(ctx: ServiceContext, studentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        return { analytics: await getAnalyticsForStudent(db, student) };
      },
      async getTask(ctx: ServiceContext, taskId: string) {
        await requireTeacherDbUser(ctx);
        const task = await requireTaskByIdOrTaskId(getDb(), taskId);
        return { task: serializeTeacherTask(mapDbTaskToRawTask(task)) };
      },
      async getAssignments(ctx: ServiceContext) {
        const { db, user } = await requireTeacherDbUser(ctx);
        return { assignments: await getAssignmentsForTeacher(db, user) };
      },
      async getAssignment(ctx: ServiceContext, assignmentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const assignment = await requireTeacherAssignment(db, user, assignmentId);
        const [tasksForAssignment, score] = await Promise.all([
          getTasksForAssignment(db, assignment.id),
          getAssignmentScore(db, assignment.id)
        ]);

        return {
          assignment: mapDbAssignmentToSummary(assignment, score),
          tasks: tasksForAssignment.map(mapDbTaskToRawTask).map(serializeTeacherTask)
        };
      },
      async createAssignment(ctx: ServiceContext, input: CreateAssignmentInput) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, input.studentId);
        const [assignment] = await db
          .insert(assignments)
          .values({
            studentId: student.id,
            tutorUserId: user.id,
            title: input.title,
            descriptionMd: input.descriptionMd,
            dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
            status: "draft"
          })
          .returning();

        await replaceAssignmentTasks(db, assignment.id, input.taskIds);
        return { assignment: mapDbAssignmentToSummary(assignment) };
      },
      async updateAssignment(ctx: ServiceContext, assignmentId: string, input: UpdateAssignmentInput = {}) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const assignment = await requireTeacherAssignment(db, user, assignmentId);
        const [updated] = await db
          .update(assignments)
          .set({
            title: input.title ?? assignment.title,
            descriptionMd: input.descriptionMd ?? assignment.descriptionMd,
            dueAt: input.dueAt ? new Date(input.dueAt) : assignment.dueAt,
            status: normalizeAssignmentStatus(input.status, assignment.status),
            updatedAt: new Date()
          })
          .where(eq(assignments.id, assignment.id))
          .returning();

        if (input.taskIds) {
          await replaceAssignmentTasks(db, assignment.id, input.taskIds);
        }

        return { assignment: mapDbAssignmentToSummary(updated) };
      },
      async publishAssignment(ctx: ServiceContext, assignmentId: string) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const assignment = await requireTeacherAssignment(db, user, assignmentId);
        const [published] = await db
          .update(assignments)
          .set({ status: "assigned", publishedAt: new Date(), updatedAt: new Date() })
          .where(eq(assignments.id, assignment.id))
          .returning();
        return { assignment: mapDbAssignmentToSummary(published) };
      },
      async getPendingReviewAttempts(ctx: ServiceContext) {
        const { db, user } = await requireTeacherDbUser(ctx);
        return { attempts: await getPendingAttemptsForTeacher(db, user) };
      },
      async reviewAttempt(ctx: ServiceContext, attemptId: string, input: ReviewAttemptInput) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const attempt = await db.query.attempts.findFirst({ where: (row) => eq(row.id, attemptId) });
        if (!attempt) throw new SetupRequiredError("Attempt was not found in database");
        await requireTeacherStudent(db, user, attempt.studentId);

        const [updated] = await db
          .update(attempts)
          .set({
            isCorrect: input.isCorrect,
            scoreAwarded: input.scoreAwarded,
            feedbackMd: input.feedbackMd,
            mistakeTags: input.mistakeTags,
            checkStatus: input.isCorrect ? "reviewed_correct" : "reviewed_incorrect",
            status: "checked",
            checkedByUserId: user.id,
            checkedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(attempts.id, attempt.id))
          .returning();

        if (input.mistakeTags.length > 0) {
          await db.insert(mistakeEvents).values(
            input.mistakeTags.map((mistakeTag) => ({
              studentId: attempt.studentId,
              attemptId: attempt.id,
              mistakeTag,
              notesMd: input.feedbackMd
            }))
          );
        }

        const task = attempt.taskId ? await db.query.tasks.findFirst({ where: (row) => eq(row.id, attempt.taskId ?? "") }) : undefined;
        if (task && shouldRecordReviewedAttemptProgress(attempt)) {
          await recordAttemptProgress(db, updated, task, input.isCorrect);
        }

        if (attempt.assignmentId) {
          await db
            .update(assignments)
            .set({ status: "reviewed", updatedAt: new Date() })
            .where(eq(assignments.id, attempt.assignmentId));
        }

        return { attempt: updated };
      }
    },
    owner: {
      async getAccessStatus(ctx: ServiceContext) {
        return { accessStatus: await getAccessStatusForUser(ctx.user) };
      },
      async listAccess(ctx: ServiceContext, filters: OwnerAccessListQuery = {}) {
        const { user } = await requireOwnerDbUser(ctx);
        return listOwnerAccess(user, filters);
      },
      async getAccessRequest(ctx: ServiceContext, subjectId: string) {
        const { user } = await requireOwnerDbUser(ctx);
        return getOwnerAccessRequestDetail(user, subjectId);
      },
      async getUserAccess(ctx: ServiceContext, userId: string) {
        const { user } = await requireOwnerDbUser(ctx);
        return getOwnerUserAccessDetail(user, userId);
      },
      async approveAccessRequest(ctx: ServiceContext, subjectId: string, input: ApproveAccessRequest) {
        const { user } = await requireOwnerDbUser(ctx);
        return approveOwnerAccessRequest(user, subjectId, input);
      },
      async rejectAccessRequest(ctx: ServiceContext, subjectId: string, input: RejectAccessRequest) {
        const { user } = await requireOwnerDbUser(ctx);
        return rejectOwnerAccessRequest(user, subjectId, input);
      },
      async updateUserAccess(ctx: ServiceContext, userId: string, input: UpdateOwnerUserAccessRequest) {
        const { user } = await requireOwnerDbUser(ctx);
        return updateOwnerUserAccess(user, userId, input);
      }
    }
  };
}

async function requireDbUser(ctx: ServiceContext) {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: (row) =>
      or(eq(row.clerkUserId, ctx.user.id), eq(row.authProviderUserId, ctx.user.id), eq(row.email, ctx.user.email))
  });

  if (!user || !user.isActive) {
    throw new SetupRequiredError("Authenticated user is not linked to a database user");
  }

  return user;
}

async function requireStudentProfile(ctx: ServiceContext) {
  const db = getDb();
  const user = await requireDbUser(ctx);
  const student = await db.query.students.findFirst({ where: (row) => eq(row.userId, user.id) });

  if (!student) {
    throw new SetupRequiredError("Student profile is not linked to the authenticated user");
  }

  return { db, user, student };
}

async function requireTeacherDbUser(ctx: ServiceContext) {
  const db = getDb();
  const user = await requireDbUser(ctx);
  if (!teacherRoles.has(user.role)) {
    throw new ServiceForbiddenError();
  }
  return { db, user };
}

async function requireOwnerDbUser(ctx: ServiceContext) {
  const db = getDb();
  const user = await requireDbUser(ctx);
  if (user.role !== "owner") {
    throw new ServiceForbiddenError();
  }
  return { db, user };
}

async function getStudentsForTeacher(db: Db, user: DbUser) {
  if (user.role === "owner") {
    return db.query.students.findMany({ orderBy: (row, { desc }) => [desc(row.updatedAt)] });
  }

  const directStudents = await db.query.students.findMany({
    where: (row) => eq(row.tutorUserId, user.id),
    orderBy: (row, { desc }) => [desc(row.updatedAt)]
  });
  const links = await db.query.teacherStudentLinks.findMany({ where: (row) => eq(row.teacherUserId, user.id) });
  const linkedStudents = await Promise.all(
    links.map((link) => db.query.students.findFirst({ where: (row) => eq(row.id, link.studentId) }))
  );

  return uniqueStudents([...directStudents, ...linkedStudents.filter((student): student is DbStudent => Boolean(student))]);
}

async function requireTeacherStudent(db: Db, user: DbUser, studentId: string) {
  const student = await db.query.students.findFirst({ where: (row) => eq(row.id, studentId) });
  if (!student) throw new SetupRequiredError("Student was not found in database");
  if (user.role === "owner" || student.tutorUserId === user.id) return student;

  const link = await db.query.teacherStudentLinks.findFirst({
    where: (row) => and(eq(row.teacherUserId, user.id), eq(row.studentId, student.id))
  });
  if (!link) throw new ServiceForbiddenError();
  return student;
}

async function requireTeacherAssignment(db: Db, user: DbUser, assignmentId: string) {
  const assignment = await db.query.assignments.findFirst({ where: (row) => eq(row.id, assignmentId) });
  if (!assignment) throw new SetupRequiredError("Assignment was not found in database");
  await requireTeacherStudent(db, user, assignment.studentId);
  return assignment;
}

async function requireStudentAssignment(db: Db, studentId: string, assignmentId: string) {
  const assignment = await db.query.assignments.findFirst({
    where: (row) => and(eq(row.id, assignmentId), eq(row.studentId, studentId))
  });
  if (!assignment) throw new ServiceForbiddenError("Assignment is not available for this student");
  return assignment;
}

async function requireTaskByIdOrTaskId(db: Db, taskId: string) {
  const task = await db.query.tasks.findFirst({ where: (row) => or(eq(row.id, taskId), eq(row.taskId, taskId)) });
  if (!task) throw new SetupRequiredError("Task was not found in database");
  return task;
}

async function requireAssignedTaskForStudent(db: Db, studentId: string, taskId: string) {
  const task = await requireTaskByIdOrTaskId(db, taskId);
  const studentAssignments = await db.query.assignments.findMany({ where: (row) => eq(row.studentId, studentId) });

  for (const assignment of studentAssignments) {
    const link = await db.query.assignmentTasks.findFirst({
      where: (row) => and(eq(row.assignmentId, assignment.id), eq(row.taskId, task.id))
    });
    if (link) return task;
  }

  throw new ServiceForbiddenError("Task is not assigned to this student");
}

async function getAssignmentsForStudent(db: Db, studentId: string) {
  const rows = await db.query.assignments.findMany({
    where: (row) => eq(row.studentId, studentId),
    orderBy: (row, { desc }) => [desc(row.updatedAt)]
  });
  return Promise.all(rows.map(async (row) => mapDbAssignmentToSummary(row, await getAssignmentScore(db, row.id))));
}

async function getAssignmentsForTeacher(db: Db, user: DbUser) {
  const rows =
    user.role === "owner"
      ? await db.query.assignments.findMany({ orderBy: (row, { desc }) => [desc(row.updatedAt)] })
      : (
          await Promise.all(
            (await getStudentsForTeacher(db, user)).map((student) =>
              db.query.assignments.findMany({
                where: (row) => eq(row.studentId, student.id),
                orderBy: (row, { desc }) => [desc(row.updatedAt)]
              })
            )
          )
        ).flat();

  const sorted = rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return Promise.all(sorted.map(async (row) => mapDbAssignmentToSummary(row, await getAssignmentScore(db, row.id))));
}

async function getTasksForAssignment(db: Db, assignmentId: string) {
  const links = await db.query.assignmentTasks.findMany({
    where: (row) => eq(row.assignmentId, assignmentId),
    orderBy: (row, { asc }) => [asc(row.position), asc(row.orderIndex)]
  });
  const taskRows = await Promise.all(links.map((link) => db.query.tasks.findFirst({ where: (row) => eq(row.id, link.taskId) })));
  return taskRows.filter((task): task is DbTask => Boolean(task));
}

async function getAssignmentScore(db: Db, assignmentId: string) {
  const links = await db.query.assignmentTasks.findMany({
    where: (row) => eq(row.assignmentId, assignmentId)
  });
  if (links.length === 0) return "0 / 0";

  const rows = await db.query.attempts.findMany({
    where: (row) => eq(row.assignmentId, assignmentId),
    orderBy: (row, { desc }) => [desc(row.attemptNo), desc(row.submittedAt)]
  });
  const latestByTask = new Map<string, typeof rows[number]>();
  for (const attempt of rows) {
    if (!attempt.taskId || latestByTask.has(attempt.taskId)) continue;
    latestByTask.set(attempt.taskId, attempt);
  }

  const correct = Array.from(latestByTask.values()).filter((attempt) => attempt.isCorrect === true).length;
  return `${correct} / ${links.length}`;
}

async function getProgressForStudent(db: Db, studentId: string) {
  const rows = await db.query.skillMastery.findMany({ where: (row) => eq(row.studentId, studentId) });
  return rows.map(mapDbSkillMastery);
}

async function getScheduleForStudent(db: Db, studentId: string) {
  const [events, lessonRows] = await Promise.all([
    db.query.scheduleEvents.findMany({
      where: (row) => eq(row.studentId, studentId),
      orderBy: (row, { asc }) => [asc(row.startsAt)]
    }),
    db.query.lessons.findMany({
      where: (row) => eq(row.studentId, studentId),
      orderBy: (row, { asc }) => [asc(row.startsAt)]
    })
  ]);

  return [...events.map(mapDbScheduleEvent), ...lessonRows.map(mapDbLessonToScheduleEvent)].sort((a, b) =>
    (a.starts_at ?? "").localeCompare(b.starts_at ?? "")
  );
}

async function getTeacherPlanState(db: Tx, studentId: string) {
  const plans = await db.query.learningPlans.findMany({
    where: (row: any) => eq(row.studentId, studentId),
    orderBy: (row: any, { desc }: any) => [desc(row.versionNo), desc(row.updatedAt)]
  });

  return {
    draftPlan: plans.find((plan: any) => plan.versionStatus === "draft") ?? null,
    activePlan: plans.find((plan: any) => plan.versionStatus === "active") ?? null,
    allPlans: plans
  };
}

async function getPlanLessons(db: Tx, planId: string) {
  return db.query.learningPlanLessons.findMany({
    where: (row: any) => eq(row.planId, planId),
    orderBy: (row: any, { asc }: any) => [asc(row.lessonNo)]
  });
}

async function getTeacherPlanPayload(db: Db, student: DbStudent) {
  const { draftPlan, activePlan } = await getTeacherPlanState(db, student.id);
  const [draftLessons, activeLessons, adjustments, events] = await Promise.all([
    draftPlan ? getPlanLessons(db, draftPlan.id) : Promise.resolve([]),
    activePlan ? getPlanLessons(db, activePlan.id) : Promise.resolve([]),
    draftPlan
      ? db.query.planAdjustments.findMany({
          where: (row: any) => and(eq(row.planId, draftPlan.id), eq(row.status, "proposed")),
          orderBy: (row: any, { desc }: any) => [desc(row.createdAt)]
        })
      : Promise.resolve([]),
    db.query.planChangeEvents.findMany({
      where: (row: any) => eq(row.studentId, student.id),
      orderBy: (row: any, { desc }: any) => [desc(row.createdAt)],
      limit: 10
    })
  ]);

  return {
    draft_plan: draftPlan ? mapDbPlanToSummary(draftPlan, student, draftLessons) : null,
    active_plan: activePlan ? mapDbPlanToSummary(activePlan, student, activeLessons) : null,
    pending_adjustments: adjustments.map(mapDbPlanAdjustment),
    recent_events: events.map(mapDbPlanChangeEvent)
  };
}

async function getStudentSafePlanForStudent(db: Db, student: DbStudent) {
  const { activePlan } = await getTeacherPlanState(db, student.id);
  if (!activePlan) return null;
  const lessonRows = await getPlanLessons(db, activePlan.id);
  const plan = mapDbPlanToSummary(activePlan, student, lessonRows);
  return {
    ...plan,
    lessons: plan.lessons.map((lesson) => ({
      ...lesson,
      teacher_notes: undefined
    })),
    rationale: undefined,
    change_summary: undefined
  };
}

async function getPlanHistoryPayload(db: Db, student: DbStudent): Promise<PlanHistoryResponse> {
  const { allPlans } = await getTeacherPlanState(db, student.id);
  const lessonsByPlan = new Map<string, Awaited<ReturnType<typeof getPlanLessons>>>();
  for (const plan of allPlans as any[]) {
    lessonsByPlan.set(plan.id, await getPlanLessons(db, plan.id));
  }

  const changeEvents = await db.query.planChangeEvents.findMany({
    where: (row: any) => eq(row.studentId, student.id),
    orderBy: (row: any, { desc }: any) => [desc(row.createdAt)]
  });

  return {
    history: allPlans.map((plan: any) => mapDbPlanToSummary(plan, student, lessonsByPlan.get(plan.id) ?? [])),
    change_events: changeEvents.map(mapDbPlanChangeEvent)
  };
}

async function getOrCreateDraftPlan(db: Tx, student: DbStudent, userId: string) {
  const current = await getTeacherPlanState(db, student.id);
  if (current.draftPlan) return current.draftPlan;

  const base = current.activePlan;
  const nextVersion =
    Math.max(0, ...current.allPlans.map((plan: any) => plan.versionNo ?? 0)) + 1;
  await db
    .update(learningPlans)
    .set({ isLatest: false, updatedAt: new Date() })
    .where(eq(learningPlans.studentId, student.id));
  const [draft] = await db
    .insert(learningPlans)
    .values({
      studentId: student.id,
      versionNo: nextVersion,
      status: "draft",
      learningTrack: student.learningTrack,
      examYear: student.examYear,
      targetScore: student.targetScore,
      targetGrade: student.targetGrade,
      goalSummary: base?.goalSummary ?? student.goalSummary,
      deadline: base?.deadline ?? student.targetDate ?? undefined,
      sessionsPerWeek: base?.sessionsPerWeek,
      sessionDurationMinutes: base?.sessionDurationMinutes,
      strategy: base?.strategy ?? student.goalSummary ?? "Current learning route",
      rationale: base?.rationale,
      planJson: base?.planJson ?? buildDefaultPlanJson(student),
      versionStatus: "draft",
      revisionOfPlanId: base?.id,
      isLatest: true,
      changeSummary: "Draft created for next revision"
    })
    .returning();

  if (base) {
    const baseLessons = await getPlanLessons(db, base.id);
    await replacePlanLessons(
      db,
      draft.id,
      baseLessons.map((lesson: any) => ({
        lessonNo: lesson.lessonNo,
        plannedDate: lesson.plannedDate?.toISOString(),
        title: lesson.title,
        lessonGoal: lesson.lessonGoal ?? undefined,
        topics: lesson.topicsJson ?? [],
        taskNumbers: lesson.taskNumbersJson ?? [],
        prototypeIds: lesson.prototypeIdsJson ?? [],
        skillAtoms: lesson.skillAtomsJson ?? [],
        status: lesson.status,
        studentSummary: lesson.studentSummary ?? undefined,
        teacherNotes: lesson.teacherNotes ?? undefined
      }))
    );
  }

  await recordPlanEvent(db, {
    planId: draft.id,
    studentId: student.id,
    actorUserId: userId,
    eventType: "created",
    status: "recorded",
    summary: `Draft version ${draft.versionNo} created`
  });

  return draft;
}

async function replacePlanLessons(
  db: Tx,
  planId: string,
  lessonsInput: NonNullable<UpdatePlanInput["lessons"]>
) {
  await db.delete(learningPlanLessons).where(eq(learningPlanLessons.planId, planId));
  if (lessonsInput.length === 0) return;

  await db.insert(learningPlanLessons).values(
    lessonsInput.map((lesson) => ({
      planId,
      lessonNo: lesson.lessonNo,
      plannedDate: lesson.plannedDate ? new Date(lesson.plannedDate) : undefined,
      title: lesson.title,
      lessonGoal: lesson.lessonGoal,
      topicsJson: lesson.topics ?? [],
      taskNumbersJson: lesson.taskNumbers ?? [],
      prototypeIdsJson: lesson.prototypeIds ?? [],
      skillAtomsJson: lesson.skillAtoms ?? [],
      teacherNotes: lesson.teacherNotes,
      studentSummary: lesson.studentSummary,
      status: lesson.status ?? "planned"
    }))
  );
}

async function recordPlanEvent(
  db: Tx,
  input: {
    planId: string;
    studentId: string;
    actorUserId: string;
    eventType: typeof planChangeEvents.$inferInsert.eventType;
    status: typeof planChangeEvents.$inferInsert.status;
    summary: string;
    approvedAt?: Date;
    appliedAt?: Date;
    metadata?: Record<string, unknown>;
  }
) {
  await db.insert(planChangeEvents).values({
    planId: input.planId,
    studentId: input.studentId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    status: input.status,
    summary: input.summary,
    metadata: input.metadata ?? {},
    approvedAt: input.approvedAt,
    appliedAt: input.appliedAt
  });
}

async function previewPlanFeedback(db: Tx, student: DbStudent, userId: string): Promise<FeedbackPreviewSummary> {
  const draftPlan = await getOrCreateDraftPlan(db, student, userId);
  const existingAdjustments = await db.query.planAdjustments.findMany({
    where: (row: any) => and(eq(row.planId, draftPlan.id), eq(row.status, "proposed")),
    orderBy: (row: any, { desc }: any) => [desc(row.createdAt)]
  });

  if (existingAdjustments.length > 0) {
    const signals = existingAdjustments.map((adjustment: any) => normalizeAdjustmentSignal(adjustment.payload));
    return {
      plan_id: draftPlan.id,
      signals,
      proposals: existingAdjustments.map(mapDbPlanAdjustment)
    };
  }

  const analytics = await getAnalyticsForStudent(db, student);
  const proposals = buildFeedbackProposals(student, draftPlan.id, analytics);
  const now = new Date();

  for (const proposal of proposals) {
    const [adjustment] = await db
      .insert(planAdjustments)
      .values({
        planId: draftPlan.id,
        studentId: student.id,
        proposedByUserId: userId,
        adjustmentType: proposal.adjustment_type,
        title: proposal.title,
        detailsMd: proposal.details_md,
        status: "proposed",
        payload: { signal: proposal.signal },
        scheduledFor: proposal.scheduled_for ? new Date(proposal.scheduled_for) : undefined
      })
      .returning();
    proposal.id = adjustment.id;
    proposal.created_at = adjustment.createdAt.toISOString();
  }

  await recordPlanEvent(db, {
    planId: draftPlan.id,
    studentId: student.id,
    actorUserId: userId,
    eventType: "review_requested",
    status: "recorded",
    summary: `Feedback preview generated with ${proposals.length} proposal(s)`,
    metadata: { signals: proposals.map((proposal) => proposal.signal), createdAt: now.toISOString() }
  });

  return {
    plan_id: draftPlan.id,
    signals: proposals.map((proposal) => proposal.signal),
    proposals
  };
}

async function applyPlanAdjustment(db: Tx, student: DbStudent, userId: string, adjustmentId: string): Promise<FeedbackPreviewSummary> {
  const adjustment = await db.query.planAdjustments.findFirst({ where: (row: any) => eq(row.id, adjustmentId) });
  if (!adjustment || adjustment.studentId !== student.id) {
    throw new SetupRequiredError("Adjustment was not found");
  }

  if (adjustment.status !== "proposed") {
    throw new ServiceForbiddenError("Adjustment is no longer actionable");
  }

  const { draftPlan } = await getTeacherPlanState(db, student.id);
  if (!draftPlan || draftPlan.id !== adjustment.planId) {
    throw new ServiceForbiddenError("Adjustment is stale for the current draft");
  }

  const now = new Date();
  const [claimedAdjustment] = await db
    .update(planAdjustments)
    .set({
      status: "approved",
      reviewedByUserId: userId,
      reviewedAt: now,
      updatedAt: now
    })
    .where(and(eq(planAdjustments.id, adjustment.id), eq(planAdjustments.status, "proposed")))
    .returning();

  if (!claimedAdjustment) {
    throw new ServiceForbiddenError("Adjustment is no longer actionable");
  }

  const lessons = await getPlanLessons(db, draftPlan.id);
  const updatedLessons = applyAdjustmentToLessons(lessons, claimedAdjustment);

  await replacePlanLessons(
    db,
    draftPlan.id,
    updatedLessons.map((lesson: any, index: number) => ({
      lessonNo: index + 1,
      plannedDate: lesson.plannedDate?.toISOString(),
      title: lesson.title,
      lessonGoal: lesson.lessonGoal ?? undefined,
      topics: lesson.topicsJson ?? [],
      taskNumbers: lesson.taskNumbersJson ?? [],
      prototypeIds: lesson.prototypeIdsJson ?? [],
      skillAtoms: lesson.skillAtomsJson ?? [],
      status: lesson.status,
      studentSummary: lesson.studentSummary ?? undefined,
      teacherNotes: lesson.teacherNotes ?? undefined
    }))
  );

  await db
    .update(planAdjustments)
    .set({
      status: "applied",
      appliedAt: now,
      updatedAt: now
    })
    .where(and(eq(planAdjustments.id, claimedAdjustment.id), eq(planAdjustments.status, "approved")));

  await recordPlanEvent(db, {
    planId: draftPlan.id,
    studentId: student.id,
    actorUserId: userId,
    eventType: "applied",
    status: "applied",
    summary: `Applied adjustment: ${claimedAdjustment.title}`,
    appliedAt: now,
    metadata: { adjustmentId: claimedAdjustment.id }
  });

  const remaining = await db.query.planAdjustments.findMany({
    where: (row: any) => and(eq(row.planId, draftPlan.id), eq(row.status, "proposed")),
    orderBy: (row: any, { desc }: any) => [desc(row.createdAt)]
  });

  return {
    plan_id: draftPlan.id,
    signals: remaining.map((item: any) => normalizeAdjustmentSignal(item.payload)),
    proposals: remaining.map(mapDbPlanAdjustment)
  };
}

async function replaceAssignmentTasks(db: Db, assignmentId: string, taskIds: string[]) {
  await db.delete(assignmentTasks).where(eq(assignmentTasks.assignmentId, assignmentId));
  if (taskIds.length === 0) return;

  const taskRows = await Promise.all(taskIds.map((taskId) => requireTaskByIdOrTaskId(db, taskId)));
  await db.insert(assignmentTasks).values(
    taskRows.map((task, index) => ({
      assignmentId,
      taskId: task.id,
      position: index,
      orderIndex: index,
      required: true
    }))
  );
}

async function getPendingAttemptsForTeacher(db: Db, user: DbUser) {
  const rows = await db.query.attempts.findMany({
    where: (row) => eq(row.checkStatus, "pending_review"),
    orderBy: (row, { desc }) => [desc(row.submittedAt)]
  });

  if (user.role === "owner") return rows;

  const visible: typeof rows = [];
  for (const attempt of rows) {
    try {
      await requireTeacherStudent(db, user, attempt.studentId);
      visible.push(attempt);
    } catch {
      // Ignore attempts outside this teacher's ownership boundary.
    }
  }
  return visible;
}

async function recordAttemptProgress(db: Db, attempt: typeof attempts.$inferSelect, task: DbTask, isCorrect: boolean) {
  const skillAtoms = task.skillAtoms ?? [];
  const now = new Date();

  for (const skillAtom of skillAtoms) {
    const previous = await db.query.skillMastery.findFirst({
      where: (row) => and(eq(row.studentId, attempt.studentId), eq(row.skillAtom, skillAtom))
    });
    const next = updateMastery(
      previous
        ? {
            skill_atom: previous.skillAtom,
            attempts: previous.attempts,
            correct: previous.correct,
            level: previous.level as ReturnType<typeof updateMastery>["level"]
          }
        : undefined,
      skillAtom,
      isCorrect
    );
    const values = {
      studentId: attempt.studentId,
      skillAtom,
      prototypeId: task.prototypeId,
      attempts: next.attempts,
      correct: next.correct,
      level: next.level,
      lastAttemptAt: attempt.submittedAt ?? now,
      updatedAt: now
    };

    if (previous) {
      await db.update(skillMastery).set(values).where(eq(skillMastery.id, previous.id));
    } else {
      await db.insert(skillMastery).values(values);
    }
  }

  if (!task.prototypeId) return;

  const previousPrototype = await db.query.studentPrototypeMastery.findFirst({
    where: (row) => and(eq(row.studentId, attempt.studentId), eq(row.prototypeId, task.prototypeId ?? ""))
  });
  const prototypeAttempts = (previousPrototype?.attempts ?? 0) + 1;
  const prototypeCorrect = (previousPrototype?.correct ?? 0) + (isCorrect ? 1 : 0);
  const prototypeValues = {
    studentId: attempt.studentId,
    prototypeId: task.prototypeId,
    attempts: prototypeAttempts,
    correct: prototypeCorrect,
    confidence: Math.round((prototypeCorrect / prototypeAttempts) * 100),
    riskFlag: !isCorrect && prototypeAttempts >= 2 ? "Вернуться к признакам прототипа" : previousPrototype?.riskFlag,
    updatedAt: now
  };

  if (previousPrototype) {
    await db.update(studentPrototypeMastery).set(prototypeValues).where(eq(studentPrototypeMastery.id, previousPrototype.id));
  } else {
    await db.insert(studentPrototypeMastery).values(prototypeValues);
  }
}

function shouldRecordReviewedAttemptProgress(attempt: typeof attempts.$inferSelect) {
  return attempt.isCorrect === null || typeof attempt.isCorrect === "undefined" || attempt.checkStatus === "pending_review";
}

async function getAnalyticsForStudent(db: Db, student: DbStudent) {
  const [plans, assignmentRows, attemptRows, mistakes, progress, prototypes] = await Promise.all([
    getTeacherPlanState(db, student.id),
    db.query.assignments.findMany({
      where: (row: any) => eq(row.studentId, student.id),
      orderBy: (row: any, { desc }: any) => [desc(row.updatedAt)]
    }),
    db.query.attempts.findMany({
      where: (row: any) => eq(row.studentId, student.id),
      orderBy: (row: any, { desc }: any) => [desc(row.submittedAt)]
    }),
    db.query.mistakeEvents.findMany({
      where: (row: any) => eq(row.studentId, student.id),
      orderBy: (row: any, { desc }: any) => [desc(row.createdAt)]
    }),
    getProgressForStudent(db, student.id),
    db.query.studentPrototypeMastery.findMany({
      where: (row: any) => eq(row.studentId, student.id),
      orderBy: (row: any, { desc }: any) => [desc(row.updatedAt)]
    })
  ]);

  const activePlan = plans.activePlan ?? plans.draftPlan;
  const lessonRows = activePlan ? await getPlanLessons(db, activePlan.id) : [];
  const completedLessons = lessonRows.filter((lesson: any) => lesson.status === "completed").length;
  const checkedAttempts = attemptRows.filter((attempt) => typeof attempt.isCorrect === "boolean");
  const correctCheckedAttempts = checkedAttempts.filter((attempt) => attempt.isCorrect === true).length;
  const totalTimeSpent = attemptRows.reduce((total, attempt) => total + (attempt.timeSpentSec ?? 0), 0);
  const overdueAssignments = assignmentRows.filter((assignment) =>
    assignment.dueAt ? assignment.dueAt.getTime() < Date.now() && assignment.status !== "reviewed" : false
  ).length;
  const completedAssignments = assignmentRows.filter((assignment) => assignment.status === "reviewed").length;
  const recurringErrors = Array.from(
    mistakes.reduce((map, mistake) => {
      map.set(mistake.mistakeTag, (map.get(mistake.mistakeTag) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([mistake_tag, count]) => ({ mistake_tag, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const weeklyBuckets = new Map<string, { attempts: number; checked_attempts: number; correct: number; time: number }>();
  for (const attempt of attemptRows) {
    const submittedAt = attempt.submittedAt ?? attempt.createdAt;
    const weekStart = toWeekStartIso(submittedAt);
    const bucket = weeklyBuckets.get(weekStart) ?? { attempts: 0, checked_attempts: 0, correct: 0, time: 0 };
    bucket.attempts += 1;
    bucket.time += attempt.timeSpentSec ?? 0;
    if (typeof attempt.isCorrect === "boolean") {
      bucket.checked_attempts += 1;
      if (attempt.isCorrect) bucket.correct += 1;
    }
    weeklyBuckets.set(weekStart, bucket);
  }

  const checkpoints = (activePlan ? mapDbPlanToSummary(activePlan, student, lessonRows).checkpoints : []).map((label, index) => ({
    label,
    status: index < completedLessons ? "done" : overdueAssignments > 0 && index === completedLessons ? "overdue" : "upcoming"
  }));
  const requiresOfficialScoring = requiresOfficialScoringData(student);

  return {
    forecast_status: resolveForecastStatus({
      checkedAttempts: checkedAttempts.length,
      overdueAssignments,
      weakSkills: progress.filter((item) => item.value < 60).length,
      requiresOfficialScoring
    }),
    forecast_reason: buildForecastReason({
      checkedAttempts: checkedAttempts.length,
      overdueAssignments,
      weakSkills: progress.filter((item) => item.value < 60).length,
      requiresOfficialScoring
    }),
    plan_completion: {
      completed_lessons: completedLessons,
      total_lessons: lessonRows.length,
      percent: lessonRows.length > 0 ? Math.round((completedLessons / lessonRows.length) * 100) : 0
    },
    homework_completion: {
      completed_assignments: completedAssignments,
      total_assignments: assignmentRows.length,
      overdue_assignments: overdueAssignments,
      percent: assignmentRows.length > 0 ? Math.round((completedAssignments / assignmentRows.length) * 100) : 0
    },
    checked_attempt_accuracy: {
      correct: correctCheckedAttempts,
      checked: checkedAttempts.length,
      percent: checkedAttempts.length > 0 ? Math.round((correctCheckedAttempts / checkedAttempts.length) * 100) : 0
    },
    time_spent: {
      total_seconds: totalTimeSpent,
      average_seconds_per_attempt: attemptRows.length > 0 ? Math.round(totalTimeSpent / attemptRows.length) : 0
    },
    skill_mastery: progress,
    prototype_mastery: prototypes.map(mapDbPrototypeMastery),
    recurring_errors: recurringErrors,
    weekly_trends: Array.from(weeklyBuckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([week_start, bucket]) => ({
        week_start,
        attempts: bucket.attempts,
        checked_attempts: bucket.checked_attempts,
        accuracy_percent: bucket.checked_attempts > 0 ? Math.round((bucket.correct / bucket.checked_attempts) * 100) : 0,
        time_spent_seconds: bucket.time
      })),
    checkpoints
  };
}

function buildDefaultPlanJson(student: DbStudent) {
  return {
    title: student.goalSummary ?? `${student.learningTrack}: current plan`,
    checkpoints: [],
    milestones: []
  };
}

function buildFeedbackProposals(
  student: DbStudent,
  planId: string,
  analytics: Awaited<ReturnType<typeof getAnalyticsForStudent>>
): PlanAdjustmentSummary[] {
  const proposals: PlanAdjustmentSummary[] = [];
  const weakSkills = analytics.skill_mastery.filter((item) => item.value < 60);

  if (analytics.homework_completion.overdue_assignments > 0) {
    proposals.push({
      id: `pending-${planId}-homework`,
      plan_id: planId,
      adjustment_type: "check",
      title: "Проверить невыполненное домашнее задание",
      details_md: "Начать следующее занятие с короткой диагностикой пропущенного домашнего задания.",
      status: "proposed",
      signal: "homework_not_done",
      created_at: new Date().toISOString()
    });
  }

  if (weakSkills.length > 0 || analytics.recurring_errors.length > 0) {
    proposals.push({
      id: `pending-${planId}-remediation`,
      plan_id: planId,
      adjustment_type: "remediation",
      title: "Добавить блок ремедиации",
      details_md: `Повторить слабые навыки: ${weakSkills.map((item) => item.skill_atom).join(", ") || "ключевые ошибки"}.`,
      status: "proposed",
      signal: "misunderstanding",
      created_at: new Date().toISOString()
    });
    proposals.push({
      id: `pending-${planId}-slowdown`,
      plan_id: planId,
      adjustment_type: "slowdown",
      title: "Замедлить темп перед новым материалом",
      details_md: "Сместить следующий новый прототип и выделить время на разбор ошибок.",
      status: "proposed",
      signal: "misunderstanding",
      created_at: new Date().toISOString()
    });
  }

  if (
    analytics.checked_attempt_accuracy.checked >= 3 &&
    analytics.checked_attempt_accuracy.percent >= 75 &&
    analytics.plan_completion.percent >= 25
  ) {
    proposals.push({
      id: `pending-${planId}-check`,
      plan_id: planId,
      adjustment_type: "check",
      title: "Добавить контрольную проверку",
      details_md: "Оставить темп без изменений, но вставить короткий ретривал-чек на следующем занятии.",
      status: "proposed",
      signal: "topic_mastered",
      created_at: new Date().toISOString()
    });
  }

  if (
    analytics.checked_attempt_accuracy.checked >= 5 &&
    analytics.checked_attempt_accuracy.percent >= 85 &&
    analytics.homework_completion.overdue_assignments === 0
  ) {
    proposals.push({
      id: `pending-${planId}-acceleration`,
      plan_id: planId,
      adjustment_type: "acceleration",
      title: "Ускорить продвижение по плану",
      details_md: `${student.displayName}: можно быстрее пройти базовые задания и перейти к смешанной практике.`,
      status: "proposed",
      signal: "fast_progress",
      created_at: new Date().toISOString()
    });
    proposals.push({
      id: `pending-${planId}-stretch`,
      plan_id: planId,
      adjustment_type: "stretch",
      title: "Добавить stretch-задачи",
      details_md: "Добавить усложненные задачи или комбинированные наборы в домашнюю работу.",
      status: "proposed",
      signal: "fast_progress",
      created_at: new Date().toISOString()
    });
  }

  return proposals;
}

function applyAdjustmentToLessons(
  lessons: Awaited<ReturnType<typeof getPlanLessons>>,
  adjustment: typeof planAdjustments.$inferSelect
) {
  if (lessons.length === 0) return lessons;

  const nextLessons = lessons.map((lesson: any) => ({ ...lesson }));
  const firstLesson = nextLessons[0];

  if (adjustment.adjustmentType === "remediation") {
    firstLesson.teacherNotes = [firstLesson.teacherNotes, adjustment.detailsMd].filter(Boolean).join("\n");
    firstLesson.studentSummary = [firstLesson.studentSummary, "Добавлен блок повторения и guided practice."].filter(Boolean).join(" ");
  }

  if (adjustment.adjustmentType === "slowdown") {
    if (firstLesson.plannedDate) {
      firstLesson.plannedDate = new Date(firstLesson.plannedDate.getTime() + 2 * 24 * 60 * 60_000);
    }
    firstLesson.teacherNotes = [firstLesson.teacherNotes, "Темп замедлен после сигнала misunderstanding."].filter(Boolean).join("\n");
  }

  if (adjustment.adjustmentType === "check") {
    firstLesson.teacherNotes = [firstLesson.teacherNotes, adjustment.detailsMd ?? "Добавить диагностическую проверку в начале занятия."].filter(Boolean).join("\n");
  }

  if (adjustment.adjustmentType === "acceleration") {
    if (firstLesson.plannedDate) {
      firstLesson.plannedDate = new Date(firstLesson.plannedDate.getTime() - 24 * 60 * 60_000);
    }
    firstLesson.teacherNotes = [firstLesson.teacherNotes, "Темп ускорен после сигнала fast_progress."].filter(Boolean).join("\n");
  }

  if (adjustment.adjustmentType === "stretch") {
    firstLesson.taskNumbersJson = [...(firstLesson.taskNumbersJson ?? []), "stretch"];
    firstLesson.teacherNotes = [firstLesson.teacherNotes, "Добавить stretch-задачи в домашнюю работу."].filter(Boolean).join("\n");
  }

  return nextLessons;
}

function normalizeAdjustmentSignal(payload: unknown): FeedbackPreviewSummary["signals"][number] {
  if (payload && typeof payload === "object" && "signal" in payload) {
    const signal = payload.signal;
    if (
      signal === "homework_not_done" ||
      signal === "misunderstanding" ||
      signal === "topic_mastered" ||
      signal === "fast_progress"
    ) {
      return signal;
    }
  }
  return "topic_mastered";
}

function mergePlanJson(current: unknown, input: UpdatePlanInput) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  return {
    ...base,
    ...(input.title ? { title: input.title } : {}),
    ...(input.strategy ? { strategy: input.strategy } : {}),
    ...(input.goalSummary ? { goalSummary: input.goalSummary } : {}),
    ...(input.checkpoints ? { checkpoints: input.checkpoints } : {}),
    ...(input.lessons ? { milestones: input.lessons.map((lesson) => lesson.title) } : {})
  };
}

function resolveForecastStatus(input: {
  checkedAttempts: number;
  overdueAssignments: number;
  weakSkills: number;
  requiresOfficialScoring: boolean;
}) {
  if (input.checkedAttempts === 0) return "insufficient_data";
  if (input.overdueAssignments > 0 || input.weakSkills >= 2) return "at_risk";
  if (input.requiresOfficialScoring) return "needs_official_scoring_data";
  return "on_track";
}

function buildForecastReason(input: {
  checkedAttempts: number;
  overdueAssignments: number;
  weakSkills: number;
  requiresOfficialScoring: boolean;
}) {
  if (input.checkedAttempts === 0) {
    return "Недостаточно проверенных попыток для устойчивого прогноза.";
  }
  if (input.overdueAssignments > 0) {
    return "Есть просроченные домашние задания, поэтому план считается рискованным.";
  }
  if (input.weakSkills >= 2) {
    return "Несколько навыков остаются ниже порога уверенности.";
  }
  if (input.requiresOfficialScoring) {
    return "Без официальных экзаменационных данных рассчитывается только статус траектории, но не балл экзамена.";
  }
  return "Текущий темп, выполнение плана и проверенные попытки соответствуют траектории.";
}

function requiresOfficialScoringData(student: DbStudent) {
  const track = student.learningTrack.toLowerCase();
  const isExamTrack = track.includes("ege") || track.includes("oge") || track.includes("егэ") || track.includes("огэ");
  return isExamTrack && (student.targetScore != null || Boolean(student.targetGrade));
}

function toWeekStartIso(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(weekStart.getUTCDate() + offset);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

function uniqueStudents(items: DbStudent[]) {
  const seen = new Set<string>();
  return items.filter((student) => {
    if (seen.has(student.id)) return false;
    seen.add(student.id);
    return true;
  });
}

function normalizeAssignmentStatus(value: string | undefined, fallback: DbAssignment["status"]): DbAssignment["status"] {
  if (value === "draft" || value === "assigned" || value === "submitted" || value === "reviewed" || value === "archived") {
    return value;
  }
  return fallback;
}
