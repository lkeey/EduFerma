import { AnyPgColumn, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { assignments } from "./assignments";
import { users } from "./identity";
import { accessRequestKind, accessRequestStatus, appRole, consentStatus, planAdjustmentStatus, planChangeEventStatus, planChangeEventType, planStatus, timestamps } from "./shared";

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    tutorUserId: uuid("tutor_user_id").references(() => users.id),
    publicCode: text("public_code").notNull(),
    displayName: text("display_name").notNull(),
    learningTrack: text("learning_track").notNull(),
    examYear: integer("exam_year"),
    currentLevel: text("current_level"),
    targetScore: integer("target_score"),
    targetGrade: text("target_grade"),
    targetDate: timestamp("target_date", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    goalSummary: text("goal_summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    publicCodeIdx: uniqueIndex("students_public_code_idx").on(table.publicCode),
    tutorIdx: index("students_tutor_idx").on(table.tutorUserId)
  })
);

export const accessRequests = pgTable(
  "access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkSubject: text("clerk_subject").notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    targetUserId: uuid("target_user_id").references(() => users.id),
    studentId: uuid("student_id").references(() => students.id),
    requestKind: accessRequestKind("request_kind").notNull().default("access"),
    requestedRole: appRole("requested_role"),
    requesterEmail: text("requester_email").notNull(),
    requesterName: text("requester_name"),
    relationshipLabel: text("relationship_label"),
    noteMd: text("note_md"),
    status: accessRequestStatus("status").notNull().default("pending"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionNoteMd: text("decision_note_md"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    clerkSubjectIdx: uniqueIndex("access_requests_clerk_subject_idx").on(table.clerkSubject),
    requesterEmailIdx: index("access_requests_requester_email_idx").on(table.requesterEmail),
    studentStatusIdx: index("access_requests_student_status_idx").on(table.studentId, table.status),
    pendingIdx: index("access_requests_pending_idx").on(table.status, table.createdAt)
  })
);

export const skillMastery = pgTable(
  "skill_mastery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id),
    skillAtom: text("skill_atom").notNull(),
    prototypeId: text("prototype_id"),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    level: text("level").notNull().default("new"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    studentSkillIdx: uniqueIndex("skill_mastery_student_skill_idx").on(table.studentId, table.skillAtom)
  })
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id),
    tutorUserId: uuid("tutor_user_id").references(() => users.id),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    notes: text("notes"),
    status: text("status").notNull().default("planned"),
    ...timestamps
  },
  (table) => ({
    studentStartsIdx: index("lessons_student_starts_idx").on(table.studentId, table.startsAt)
  })
);

export const teacherStudentLinks = pgTable(
  "teacher_student_links",
  {
    teacherUserId: uuid("teacher_user_id").notNull().references(() => users.id),
    studentId: uuid("student_id").notNull().references(() => students.id),
    ...timestamps
  },
  (table) => ({
    linkIdx: uniqueIndex("teacher_student_links_idx").on(table.teacherUserId, table.studentId)
  })
);

export const studentGoals = pgTable("student_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id),
  summary: text("summary").notNull(),
  targetScore: integer("target_score"),
  targetGrade: text("target_grade"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  ...timestamps
});

export const learningPlans = pgTable(
  "learning_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id),
    versionNo: integer("version_no").notNull().default(1),
    status: text("status").notNull().default("active"),
    learningTrack: text("learning_track").notNull(),
    examYear: integer("exam_year"),
    targetScore: integer("target_score"),
    targetGrade: text("target_grade"),
    goalSummary: text("goal_summary"),
    deadline: timestamp("deadline", { withTimezone: true }),
    sessionsPerWeek: integer("sessions_per_week"),
    sessionDurationMinutes: integer("session_duration_minutes"),
    strategy: text("strategy").notNull(),
    rationale: text("rationale"),
    planJson: jsonb("plan_json").$type<Record<string, unknown>>().notNull().default({}),
    versionStatus: planStatus("version_status").notNull().default("active"),
    revisionOfPlanId: uuid("revision_of_plan_id").references((): AnyPgColumn => learningPlans.id),
    isLatest: boolean("is_latest").notNull().default(true),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    changeSummary: text("change_summary"),
    ...timestamps
  },
  (table) => ({
    studentVersionIdx: uniqueIndex("learning_plans_student_version_idx").on(table.studentId, table.versionNo),
    latestIdx: index("learning_plans_latest_idx").on(table.studentId, table.isLatest),
    revisionIdx: index("learning_plans_revision_idx").on(table.revisionOfPlanId)
  })
);

export const learningPlanLessons = pgTable(
  "learning_plan_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").notNull().references(() => learningPlans.id),
    lessonNo: integer("lesson_no").notNull(),
    plannedDate: timestamp("planned_date", { withTimezone: true }),
    title: text("title").notNull(),
    lessonGoal: text("lesson_goal"),
    topicsJson: jsonb("topics_json").$type<string[]>().notNull().default([]),
    taskNumbersJson: jsonb("task_numbers_json").$type<string[]>().notNull().default([]),
    prototypeIdsJson: jsonb("prototype_ids_json").$type<string[]>().notNull().default([]),
    skillAtomsJson: jsonb("skill_atoms_json").$type<string[]>().notNull().default([]),
    teacherNotes: text("teacher_notes"),
    studentSummary: text("student_summary"),
    status: text("status").notNull().default("planned"),
    ...timestamps
  },
  (table) => ({
    planLessonNoIdx: uniqueIndex("learning_plan_lessons_plan_lesson_no_idx").on(table.planId, table.lessonNo)
  })
);

export const scheduleEvents = pgTable(
  "schedule_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id),
    assignmentId: uuid("assignment_id").references(() => assignments.id),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("planned"),
    meetingUrl: text("meeting_url"),
    notesMd: text("notes_md"),
    ...timestamps
  },
  (table) => ({
    studentStartsIdx: index("schedule_events_student_starts_idx").on(table.studentId, table.startsAt)
  })
);

export const planChangeEvents = pgTable(
  "plan_change_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").notNull().references(() => learningPlans.id),
    studentId: uuid("student_id").notNull().references(() => students.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    eventType: planChangeEventType("event_type").notNull(),
    status: planChangeEventStatus("status").notNull().default("recorded"),
    summary: text("summary").notNull(),
    diffJson: jsonb("diff_json").$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    planCreatedIdx: index("plan_change_events_plan_created_idx").on(table.planId, table.createdAt),
    studentStatusIdx: index("plan_change_events_student_status_idx").on(table.studentId, table.status)
  })
);

export const planAdjustments = pgTable(
  "plan_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").notNull().references(() => learningPlans.id),
    studentId: uuid("student_id").notNull().references(() => students.id),
    changeEventId: uuid("change_event_id").references(() => planChangeEvents.id),
    proposedByUserId: uuid("proposed_by_user_id").references(() => users.id),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    adjustmentType: text("adjustment_type").notNull(),
    title: text("title").notNull(),
    detailsMd: text("details_md"),
    status: planAdjustmentStatus("status").notNull().default("proposed"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    planStatusIdx: index("plan_adjustments_plan_status_idx").on(table.planId, table.status),
    studentStatusIdx: index("plan_adjustments_student_status_idx").on(table.studentId, table.status),
    eventIdx: index("plan_adjustments_event_idx").on(table.changeEventId)
  })
);

export const studentPrototypeMastery = pgTable(
  "student_prototype_mastery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id),
    prototypeId: text("prototype_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    confidence: integer("confidence").notNull().default(0),
    riskFlag: text("risk_flag"),
    ...timestamps
  },
  (table) => ({
    studentPrototypeIdx: uniqueIndex("student_prototype_mastery_idx").on(table.studentId, table.prototypeId)
  })
);

export const publicResults = pgTable(
  "public_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").references(() => students.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    published: boolean("published").notNull().default(false),
    consentStatus: consentStatus("consent_status").notNull().default("pending"),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps
  },
  (table) => ({
    publishedIdx: index("public_results_published_idx").on(table.published, table.consentStatus)
  })
);
