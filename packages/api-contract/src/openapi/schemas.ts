import { arrayOf, type JsonSchema, objectSchema, ref } from "./helpers";
import { importSchemas } from "./imports";
import { ownerSchemas } from "./owner";
import { planSchemas } from "./plans";
import { publicationSchemas } from "./publications";

const stringSchema = { type: "string" };
const optionalString = { type: "string" };
const nullableString = { type: ["string", "null"] };
const dateTimeString = { type: "string", format: "date-time" };
const numberSchema = { type: "number" };
const integerSchema = { type: "integer" };
const booleanSchema = { type: "boolean" };
const unknownObject = { type: "object", additionalProperties: true };
const appRoleSchema = {
  type: "string",
  enum: ["owner", "tutor", "teacher", "student", "guardian", "guest"]
};

const sharedTaskProperties = {
  id: stringSchema,
  task_id: stringSchema,
  title: optionalString,
  learning_track: stringSchema,
  exam: optionalString,
  task_number: optionalString,
  topic: optionalString,
  prototype_id: optionalString,
  skill_atoms: arrayOf(stringSchema),
  difficulty_level: stringSchema,
  source_name: stringSchema,
  source_url: optionalString,
  statement_md: stringSchema,
  verification_status: stringSchema,
  license_status: stringSchema,
  status: stringSchema
};

const sharedTaskRequired = [
  "id",
  "task_id",
  "learning_track",
  "skill_atoms",
  "difficulty_level",
  "source_name",
  "statement_md",
  "verification_status",
  "license_status",
  "status"
];

const baseSchemas: Record<string, JsonSchema> = {
  ApiError: objectSchema({
    error: objectSchema({
      code: {
        type: "string",
        enum: [
          "UNAUTHORIZED",
          "FORBIDDEN",
          "NOT_FOUND",
          "VALIDATION_ERROR",
          "CONFLICT",
          "RATE_LIMITED",
          "SETUP_REQUIRED",
          "INTERNAL_ERROR"
        ]
      },
      message: stringSchema,
      details: {}
    }, ["code", "message"], true)
  }),
  GenericObject: unknownObject,
  OpenApiDocument: unknownObject,
  HtmlDocument: {
    type: "string",
    description: "Swagger UI HTML document."
  },
  ApiSource: objectSchema({
    kind: {
      type: "string",
      enum: ["database", "demo-fallback"]
    },
    reason: optionalString
  }, ["kind"]),
  TaskSummary: objectSchema({
    id: stringSchema,
    taskId: stringSchema,
    learningTrack: stringSchema,
    exam: nullableString,
    taskNumber: nullableString,
    topic: nullableString,
    prototypeId: nullableString,
    difficultyLevel: stringSchema,
    sourceName: stringSchema,
    sourceUrl: nullableString,
    status: stringSchema,
    updatedAt: dateTimeString
  }),
  TaskBankResponse: objectSchema({
    source: ref("ApiSource"),
    totalTasks: integerSchema,
    activeTasks: integerSchema,
    tasks: arrayOf(ref("TaskSummary"))
  }),
  DiagnosticsEnvironmentSnapshot: objectSchema({
    clerkConfigured: booleanSchema,
    databaseConfigured: booleanSchema,
    ownerEmailConfigured: booleanSchema
  }),
  DiagnosticsAccessSnapshot: objectSchema({
    role: appRoleSchema,
    emailMasked: nullableString,
    authenticated: booleanSchema,
    canViewExtended: booleanSchema
  }),
  DiagnosticCheck: objectSchema({
    name: stringSchema,
    route: stringSchema,
    status: {
      type: "string",
      enum: ["ok", "warning", "error", "skipped"]
    },
    message: stringSchema,
    checkedAt: dateTimeString
  }),
  DiagnosticsResponse: objectSchema({
    timestamp: dateTimeString,
    status: {
      type: "string",
      enum: ["ok", "warning", "error"]
    },
    summary: stringSchema,
    safeForSharing: {
      type: "boolean",
      enum: [true],
      description: "Diagnostics contain only booleans, masked identifiers, and sanitized messages."
    },
    environment: ref("DiagnosticsEnvironmentSnapshot"),
    access: ref("DiagnosticsAccessSnapshot"),
    likelyIssues: arrayOf(stringSchema),
    checks: arrayOf(ref("DiagnosticCheck"))
  }),
  HealthResponse: objectSchema({
    ok: booleanSchema,
    service: stringSchema,
    version: stringSchema,
    time: stringSchema,
    database: booleanSchema,
    clerk: booleanSchema,
    checks: unknownObject
  }),
  DatabaseHealthResponse: objectSchema({
    ok: booleanSchema,
    configured: booleanSchema,
    latencyMs: numberSchema,
    size: unknownObject
  }, ["ok", "configured"], true),
  DemoAuthResponse: objectSchema({
    ok: booleanSchema,
    role: stringSchema,
    redirectTo: stringSchema
  }, ["ok"], true),
  ServiceUser: objectSchema({
    id: stringSchema,
    dbUserId: optionalString,
    email: stringSchema,
    name: optionalString,
    role: {
      type: "string",
      enum: ["owner", "teacher", "tutor", "student", "guardian", "guest"]
    }
  }, ["id", "email", "role"]),
  CurrentUserResponse: objectSchema({
    user: ref("ServiceUser")
  }),
  AssignmentSummary: objectSchema({
    id: stringSchema,
    title: stringSchema,
    status: stringSchema,
    due_at: optionalString,
    score: optionalString
  }, ["id", "title", "status"]),
  StudentSummary: objectSchema({
    id: stringSchema,
    display_name: stringSchema,
    learning_track: stringSchema,
    next_topic: optionalString,
    risk: optionalString
  }, ["id", "display_name", "learning_track"]),
  ScheduleEvent: objectSchema({
    id: stringSchema,
    title: stringSchema,
    starts_at: optionalString,
    duration_minutes: integerSchema,
    status: stringSchema
  }, ["id", "title", "duration_minutes", "status"]),
  PlanSummary: objectSchema({
    student_id: stringSchema,
    title: stringSchema,
    milestones: arrayOf(stringSchema)
  }),
  ProgressSummary: objectSchema({
    skill_atom: stringSchema,
    value: numberSchema
  }),
  StudentTask: objectSchema(sharedTaskProperties, sharedTaskRequired),
  TeacherTask: objectSchema({
    ...sharedTaskProperties,
    answer_json: {},
    solution_md: optionalString,
    teacher_notes: optionalString,
    local_source_path: optionalString
  }, sharedTaskRequired),
  StudentDashboardResponse: objectSchema({
    assignments: arrayOf(ref("AssignmentSummary")),
    progress: arrayOf(ref("ProgressSummary")),
    schedule: arrayOf(ref("ScheduleEvent"))
  }),
  TeacherDashboardResponse: objectSchema({
    students: arrayOf(ref("StudentSummary")),
    pendingReview: integerSchema,
    progress: arrayOf(ref("ProgressSummary"))
  }),
  ScheduleResponse: objectSchema({
    events: arrayOf(ref("ScheduleEvent"))
  }),
  ScheduleEventResponse: objectSchema({
    event: ref("ScheduleEvent")
  }),
  PlanResponse: objectSchema({
    plan: ref("PlanSummary")
  }),
  AssignmentsResponse: objectSchema({
    assignments: arrayOf(ref("AssignmentSummary"))
  }),
  AssignmentResponse: objectSchema({
    assignment: ref("AssignmentSummary")
  }),
  StudentAssignmentResponse: objectSchema({
    assignment: ref("AssignmentSummary"),
    tasks: arrayOf(ref("StudentTask"))
  }),
  TeacherAssignmentResponse: objectSchema({
    assignment: ref("AssignmentSummary"),
    tasks: arrayOf(ref("TeacherTask"))
  }),
  StudentTaskResponse: objectSchema({
    task: ref("StudentTask")
  }),
  TeacherTaskResponse: objectSchema({
    task: ref("TeacherTask")
  }),
  TeacherTaskBankResponse: objectSchema({
    tasks: arrayOf(ref("TeacherTask")),
    page: integerSchema,
    pageSize: integerSchema,
    total: integerSchema
  }),
  StudentsResponse: objectSchema({
    students: arrayOf(ref("StudentSummary"))
  }),
  StudentResponse: objectSchema({
    student: ref("StudentSummary")
  }),
  ProgressResponse: objectSchema({
    progress: arrayOf(ref("ProgressSummary"))
  }),
  AttemptResult: objectSchema({
    attemptId: stringSchema,
    checkStatus: {
      type: "string",
      enum: ["checked", "pending_review"]
    },
    isCorrect: booleanSchema,
    feedback: optionalString,
    nextAllowedAction: {
      type: "string",
      enum: ["continue", "wait_review"]
    }
  }, ["attemptId", "checkStatus", "nextAllowedAction"]),
  PendingReviewAttempt: objectSchema({
    id: stringSchema,
    assignmentId: stringSchema,
    studentId: stringSchema
  }, ["id"], true),
  PendingReviewAttemptsResponse: objectSchema({
    attempts: arrayOf(ref("PendingReviewAttempt"))
  }),
  AttemptReviewResponse: objectSchema({
    attempt: unknownObject
  }),
  SubmitAttemptRequest: objectSchema({
    assignmentId: stringSchema,
    answer: stringSchema,
    startedAt: optionalString,
    timeSpentSec: integerSchema
  }, ["assignmentId", "answer"]),
  LegacySubmitAttemptRequest: objectSchema({
    assignmentId: stringSchema,
    taskId: stringSchema,
    answer: stringSchema,
    startedAt: optionalString,
    timeSpentSec: integerSchema
  }, ["assignmentId", "taskId", "answer"]),
  CreateAssignmentRequest: objectSchema({
    studentId: stringSchema,
    title: stringSchema,
    descriptionMd: optionalString,
    dueAt: optionalString,
    taskIds: arrayOf(stringSchema)
  }, ["studentId", "title", "taskIds"]),
  UpdateAssignmentRequest: objectSchema({
    title: optionalString,
    descriptionMd: optionalString,
    dueAt: optionalString,
    taskIds: arrayOf(stringSchema),
    status: optionalString
  }, []),
  UpdatePlanRequest: objectSchema({
    title: optionalString,
    milestones: arrayOf(stringSchema),
    lessonStatus: optionalString
  }, []),
  CreateScheduleEventRequest: objectSchema({
    title: stringSchema,
    startsAt: optionalString,
    durationMinutes: integerSchema
  }, ["title", "durationMinutes"]),
  ReviewAttemptRequest: objectSchema({
    isCorrect: booleanSchema,
    scoreAwarded: numberSchema,
    feedbackMd: optionalString,
    mistakeTags: arrayOf(stringSchema)
  }, ["isCorrect", "mistakeTags"]),
  LegacyReviewAttemptRequest: objectSchema({
    attemptId: stringSchema,
    isCorrect: booleanSchema,
    scoreAwarded: numberSchema,
    feedbackMd: optionalString,
    mistakeTags: arrayOf(stringSchema)
  }, ["attemptId", "isCorrect", "mistakeTags"])
};

export const schemas: Record<string, JsonSchema> = {
  ...baseSchemas,
  ...ownerSchemas,
  ...importSchemas,
  ...planSchemas,
  ...publicationSchemas
};
