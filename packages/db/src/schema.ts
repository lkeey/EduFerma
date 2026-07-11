import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", ["owner", "teacher", "tutor", "student", "guardian"]);
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);
export const consentStatus = pgEnum("consent_status", ["granted", "pending", "revoked", "not_required"]);
export const taskStatus = pgEnum("task_status", ["active", "draft", "archived", "needs_review"]);
export const assignmentStatus = pgEnum("assignment_status", ["draft", "assigned", "submitted", "reviewed", "archived"]);
export const attemptStatus = pgEnum("attempt_status", ["started", "submitted", "checked", "needs_review"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "converted", "closed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    authProviderUserId: text("auth_provider_user_id"),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: appRole("role").notNull().default("student"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps
  },
  (table) => ({
    clerkUserIdIdx: uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
    emailIdx: uniqueIndex("users_email_idx").on(table.email)
  })
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: appRole("role").notNull().default("student"),
    status: invitationStatus("status").notNull().default("pending"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    emailStatusIdx: index("invitations_email_status_idx").on(table.email, table.status)
  })
);

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

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: text("task_id").notNull(),
    canonicalHash: text("canonical_hash"),
    learningTrack: text("learning_track").notNull(),
    exam: text("exam"),
    examYear: integer("exam_year"),
    subject: text("subject").notNull().default("informatics"),
    taskNumber: text("task_number"),
    topic: text("topic"),
    subtopic: text("subtopic"),
    prototypeId: text("prototype_id"),
    skillAtoms: jsonb("skill_atoms").$type<string[]>().notNull().default([]),
    difficultyLevel: text("difficulty_level").notNull().default("unknown"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    sourceTaskId: text("source_task_id"),
    statementMd: text("statement_md").notNull(),
    answerJson: jsonb("answer_json").$type<Record<string, unknown>>(),
    answerHash: text("answer_hash"),
    solutionMd: text("solution_md"),
    verificationStatus: text("verification_status").notNull().default("unknown"),
    licenseStatus: text("license_status").notNull().default("unknown"),
    status: taskStatus("status").notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    taskIdIdx: uniqueIndex("tasks_task_id_idx").on(table.taskId),
    prototypeIdx: index("tasks_prototype_idx").on(table.learningTrack, table.prototypeId),
    statusIdx: index("tasks_status_idx").on(table.status)
  })
);

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
    studentAttemptIdx: index("attempts_student_idx").on(table.studentId, table.submittedAt)
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

export const learningPlans = pgTable("learning_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id),
  versionNo: integer("version_no").notNull().default(1),
  status: text("status").notNull().default("active"),
  learningTrack: text("learning_track").notNull(),
  examYear: integer("exam_year"),
  targetScore: integer("target_score"),
  targetGrade: text("target_grade"),
  strategy: text("strategy").notNull(),
  planJson: jsonb("plan_json").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
});

export const learningPlanLessons = pgTable("learning_plan_lessons", {
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
});

export const scheduleEvents = pgTable("schedule_events", {
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
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: text("source_id").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  licenseStatus: text("license_status").notNull().default("unknown"),
  ...timestamps
});

export const prototypes = pgTable("prototypes", {
  id: uuid("id").primaryKey().defaultRandom(),
  prototypeId: text("prototype_id").notNull(),
  title: text("title").notNull(),
  taskNumber: text("task_number"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
});

export const skillAtoms = pgTable("skill_atoms", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillAtom: text("skill_atom").notNull(),
  title: text("title").notNull(),
  topic: text("topic"),
  ...timestamps
});

export const taskSkillAtoms = pgTable(
  "task_skill_atoms",
  {
    taskId: uuid("task_id").notNull().references(() => tasks.id),
    skillAtomId: uuid("skill_atom_id").notNull().references(() => skillAtoms.id),
    ...timestamps
  },
  (table) => ({
    taskSkillIdx: uniqueIndex("task_skill_atoms_idx").on(table.taskId, table.skillAtomId)
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

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    subjectUserId: uuid("subject_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    actionIdx: index("audit_events_action_idx").on(table.action, table.createdAt)
  })
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    contact: text("contact").notNull(),
    source: text("source").notNull().default("telegram"),
    status: leadStatus("status").notNull().default("new"),
    message: text("message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    contactIdx: index("leads_contact_idx").on(table.contact)
  })
);

export const telegramSubscribers = pgTable(
  "telegram_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    telegramUserId: text("telegram_user_id").notNull(),
    chatId: text("chat_id").notNull(),
    chatType: text("chat_type").notNull().default("private"),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    languageCode: text("language_code"),
    isActive: boolean("is_active").notNull().default(true),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    lastStartAt: timestamp("last_start_at", { withTimezone: true }),
    lastCommandAt: timestamp("last_command_at", { withTimezone: true }),
    source: text("source").notNull().default("telegram_start"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    chatIdIdx: uniqueIndex("telegram_subscribers_chat_id_idx").on(table.chatId),
    userIdx: index("telegram_subscribers_user_idx").on(table.telegramUserId),
    activeIdx: index("telegram_subscribers_active_idx").on(table.isActive)
  })
);

export const telegramBroadcastOutbox = pgTable(
  "telegram_broadcast_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriberId: uuid("subscriber_id").notNull().references(() => telegramSubscribers.id),
    broadcastKey: text("broadcast_key").notNull(),
    chatId: text("chat_id").notNull(),
    messageText: text("message_text").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => ({
    subscriberBroadcastIdx: uniqueIndex("telegram_broadcast_outbox_subscriber_broadcast_idx").on(
      table.subscriberId,
      table.broadcastKey
    ),
    statusIdx: index("telegram_broadcast_outbox_status_idx").on(table.status),
    chatIdx: index("telegram_broadcast_outbox_chat_idx").on(table.chatId)
  })
);
