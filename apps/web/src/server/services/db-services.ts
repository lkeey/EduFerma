import { and, eq, or } from "drizzle-orm";
import { getDb } from "@eduferma/db";
import {
  assignmentTasks,
  assignments,
  attempts,
  learningPlanLessons,
  learningPlans,
  lessons,
  mistakeEvents,
  scheduleEvents,
  skillMastery,
  studentPrototypeMastery,
  students,
  tasks,
  teacherStudentLinks,
  users
} from "@eduferma/db";
import {
  SetupRequiredError,
  ServiceForbiddenError,
  serializeStudentTask,
  serializeTeacherTask
} from "@eduferma/core/services";
import { checkShortAnswer, updateMastery } from "@eduferma/core";
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
  mapDbPlanToSummary,
  mapDbScheduleEvent,
  mapDbSkillMastery,
  mapDbStudentToSummary,
  mapDbTaskToRawTask
} from "./db-mappers";

type Db = ReturnType<typeof getDb>;
type DbUser = typeof users.$inferSelect;
type DbStudent = typeof students.$inferSelect;
type DbAssignment = typeof assignments.$inferSelect;
type DbTask = typeof tasks.$inferSelect;

const teacherRoles = new Set(["owner", "teacher", "tutor"]);

export function createDbPlatformServices() {
  return {
    common: {
      async getMe(ctx: ServiceContext) {
        if (ctx.user.role === "guest") {
          return { user: ctx.user };
        }

        const dbUser = await requireDbUser(ctx);
        return {
          user: {
            ...ctx.user,
            id: dbUser.authProviderUserId ?? dbUser.clerkUserId ?? ctx.user.id,
            dbUserId: dbUser.id,
            role: dbUser.role,
            name: dbUser.displayName ?? ctx.user.name
          }
        };
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
        return { plan: await getPlanForStudent(db, student) };
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
      }
    },
    teacher: {
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
        return { plan: await getPlanForStudent(db, student) };
      },
      async updateStudentPlan(ctx: ServiceContext, studentId: string, input: UpdatePlanInput = {}) {
        const { db, user } = await requireTeacherDbUser(ctx);
        const student = await requireTeacherStudent(db, user, studentId);
        const currentPlan = await db.query.learningPlans.findFirst({
          where: (row) => eq(row.studentId, student.id),
          orderBy: (row, { desc }) => [desc(row.versionNo), desc(row.updatedAt)]
        });

        const planJson = mergePlanJson(currentPlan?.planJson, input);
        const [plan] = currentPlan
          ? await db
              .update(learningPlans)
              .set({ planJson, updatedAt: new Date() })
              .where(eq(learningPlans.id, currentPlan.id))
              .returning()
          : await db
              .insert(learningPlans)
              .values({
                studentId: student.id,
                learningTrack: student.learningTrack,
                strategy: input.title ?? student.goalSummary ?? "Current learning route",
                planJson
              })
              .returning();

        return { plan: mapDbPlanToSummary(plan, student) };
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
        return { progress: await getProgressForStudent(db, student.id) };
      },
      async getTaskBank(ctx: ServiceContext) {
        await requireTeacherDbUser(ctx);
        const taskRows = await getDb().query.tasks.findMany({
          orderBy: (row, { desc }) => [desc(row.updatedAt)],
          limit: 50
        });
        return { tasks: taskRows.map(mapDbTaskToRawTask).map(serializeTeacherTask), page: 1, pageSize: 50, total: taskRows.length };
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

async function getPlanForStudent(db: Db, student: DbStudent) {
  const plan = await db.query.learningPlans.findFirst({
    where: (row) => eq(row.studentId, student.id),
    orderBy: (row, { desc }) => [desc(row.versionNo), desc(row.updatedAt)]
  });
  const lessonRows = plan
    ? await db.query.learningPlanLessons.findMany({
        where: (row) => eq(row.planId, plan.id),
        orderBy: (row, { asc }) => [asc(row.lessonNo)]
      })
    : [];
  return mapDbPlanToSummary(plan ?? null, student, lessonRows.map((lesson) => lesson.title));
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

function mergePlanJson(current: unknown, input: UpdatePlanInput) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  return {
    ...base,
    ...(input.title ? { title: input.title } : {}),
    ...(input.milestones ? { milestones: input.milestones } : {}),
    ...(input.lessonStatus ? { lessonStatus: input.lessonStatus } : {})
  };
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
