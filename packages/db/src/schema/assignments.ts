import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { students } from "./academics";
import { tasks } from "./content";
import { users } from "./identity";
import { assignmentStatus, attemptStatus, timestamps } from "./shared";

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id),
    tutorUserId: uuid("tutor_user_id").references(() => users.id),
    title: text("title").notNull(),
    descriptionMd: text("description_md"),
    status: assignmentStatus("status").notNull().default("draft"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    studentStatusIdx: index("assignments_student_status_idx").on(table.studentId, table.status)
  })
);

export const assignmentTasks = pgTable(
  "assignment_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id").notNull().references(() => assignments.id),
    taskId: uuid("task_id").notNull().references(() => tasks.id),
    position: integer("position").notNull().default(0),
    orderIndex: integer("order_index").notNull().default(0),
    points: integer("points").notNull().default(1),
    required: boolean("required").notNull().default(true),
    revealAnswerAfterSubmit: boolean("reveal_answer_after_submit").notNull().default(false),
    ...timestamps
  },
  (table) => ({
    assignmentPositionIdx: uniqueIndex("assignment_tasks_assignment_position_idx").on(table.assignmentId, table.position)
  })
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentTaskId: uuid("assignment_task_id").notNull().references(() => assignmentTasks.id),
    studentId: uuid("student_id").notNull().references(() => students.id),
    assignmentId: uuid("assignment_id").references(() => assignments.id),
    taskId: uuid("task_id").references(() => tasks.id),
    attemptNo: integer("attempt_no").notNull().default(1),
    submittedAnswer: text("submitted_answer"),
    answerJson: jsonb("answer_json").$type<Record<string, unknown>>(),
    isCorrect: boolean("is_correct"),
    scoreAwarded: integer("score_awarded"),
    checkStatus: text("check_status").notNull().default("pending_review"),
    status: attemptStatus("status").notNull().default("started"),
    timeSpentSec: integer("time_spent_sec").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    checkedByUserId: uuid("checked_by_user_id").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    feedback: text("feedback"),
    feedbackMd: text("feedback_md"),
    mistakeTags: jsonb("mistake_tags").$type<string[]>().notNull().default([]),
    ...timestamps
  },
  (table) => ({
    studentAttemptIdx: index("attempts_student_idx").on(table.studentId, table.submittedAt),
    assignmentAttemptNoIdx: uniqueIndex("attempts_assignment_task_attempt_no_idx").on(table.assignmentTaskId, table.attemptNo)
  })
);

export const attemptEvents = pgTable("attempt_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id").notNull().references(() => attempts.id),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const mistakeEvents = pgTable("mistake_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id),
  attemptId: uuid("attempt_id").references(() => attempts.id),
  mistakeTag: text("mistake_tag").notNull(),
  notesMd: text("notes_md"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
