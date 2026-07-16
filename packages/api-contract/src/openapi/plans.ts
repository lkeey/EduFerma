import type { JsonSchema } from "./helpers";

const stringSchema = { type: "string" };
const optionalString = { type: "string" };
const integerSchema = { type: "integer" };

function objectSchema(properties: Record<string, JsonSchema>, required: string[] = Object.keys(properties)) {
  return { type: "object", properties, required, additionalProperties: false };
}

function arrayOf(schema: JsonSchema) {
  return { type: "array", items: schema };
}

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

export const planSchemas: Record<string, JsonSchema> = {
  PlanLessonSummary: objectSchema({
    id: stringSchema,
    lesson_no: integerSchema,
    planned_date: optionalString,
    title: stringSchema,
    lesson_goal: optionalString,
    topics: arrayOf(stringSchema),
    task_numbers: arrayOf(stringSchema),
    prototype_ids: arrayOf(stringSchema),
    skill_atoms: arrayOf(stringSchema),
    status: stringSchema,
    student_summary: optionalString,
    teacher_notes: optionalString
  }, ["id", "lesson_no", "title", "topics", "task_numbers", "prototype_ids", "skill_atoms", "status"]),
  PlanSummary: objectSchema({
    id: stringSchema,
    student_id: stringSchema,
    version_no: integerSchema,
    status: { type: "string", enum: ["draft", "active", "superseded", "archived"] },
    title: stringSchema,
    strategy: stringSchema,
    learning_track: stringSchema,
    goal_summary: optionalString,
    deadline: optionalString,
    sessions_per_week: integerSchema,
    session_duration_minutes: integerSchema,
    rationale: optionalString,
    checkpoints: arrayOf(stringSchema),
    lessons: arrayOf(ref("PlanLessonSummary")),
    milestones: arrayOf(stringSchema),
    change_summary: optionalString,
    published_at: optionalString,
    superseded_at: optionalString
  }, ["id", "student_id", "version_no", "status", "title", "strategy", "learning_track", "checkpoints", "lessons", "milestones"]),
  StudentPlanSummary: objectSchema({
    id: stringSchema,
    version_no: integerSchema,
    status: { type: "string", enum: ["draft", "active", "superseded", "archived"] },
    title: stringSchema,
    strategy: stringSchema,
    learning_track: stringSchema,
    goal_summary: optionalString,
    deadline: optionalString,
    sessions_per_week: integerSchema,
    session_duration_minutes: integerSchema,
    checkpoints: arrayOf(stringSchema),
    lessons: arrayOf(objectSchema({
      id: stringSchema,
      lesson_no: integerSchema,
      planned_date: optionalString,
      title: stringSchema,
      lesson_goal: optionalString,
      topics: arrayOf(stringSchema),
      task_numbers: arrayOf(stringSchema),
      prototype_ids: arrayOf(stringSchema),
      skill_atoms: arrayOf(stringSchema),
      status: stringSchema,
      student_summary: optionalString
    }, ["id", "lesson_no", "title", "topics", "task_numbers", "prototype_ids", "skill_atoms", "status"])),
    milestones: arrayOf(stringSchema),
    published_at: optionalString,
    superseded_at: optionalString
  }, ["id", "version_no", "status", "title", "strategy", "learning_track", "checkpoints", "lessons", "milestones"]),
  PlanChangeEventSummary: objectSchema({
    id: stringSchema,
    plan_id: stringSchema,
    event_type: { type: "string", enum: ["created", "updated", "review_requested", "approved", "applied", "superseded"] },
    status: { type: "string", enum: ["pending", "recorded", "approved", "rejected", "applied"] },
    summary: stringSchema,
    created_at: stringSchema,
    approved_at: optionalString,
    applied_at: optionalString
  }, ["id", "plan_id", "event_type", "status", "summary", "created_at"]),
  PlanAdjustmentSummary: objectSchema({
    id: stringSchema,
    plan_id: stringSchema,
    adjustment_type: { type: "string", enum: ["remediation", "slowdown", "check", "acceleration", "stretch"] },
    title: stringSchema,
    details_md: optionalString,
    status: { type: "string", enum: ["proposed", "approved", "rejected", "applied"] },
    signal: { type: "string", enum: ["homework_not_done", "misunderstanding", "topic_mastered", "fast_progress"] },
    created_at: stringSchema,
    scheduled_for: optionalString,
    reviewed_at: optionalString,
    applied_at: optionalString
  }, ["id", "plan_id", "adjustment_type", "title", "status", "signal", "created_at"]),
  TeacherPlanResponse: objectSchema({
    draft_plan: { anyOf: [ref("PlanSummary"), { type: "null" }] },
    active_plan: { anyOf: [ref("PlanSummary"), { type: "null" }] },
    pending_adjustments: arrayOf(ref("PlanAdjustmentSummary")),
    recent_events: arrayOf(ref("PlanChangeEventSummary"))
  }),
  PublishPlanResponse: objectSchema({
    plan: ref("PlanSummary")
  }),
  PlanHistoryResponse: objectSchema({
    history: arrayOf(ref("PlanSummary")),
    change_events: arrayOf(ref("PlanChangeEventSummary"))
  }),
  FeedbackPreviewResponse: objectSchema({
    preview: objectSchema({
      plan_id: stringSchema,
      signals: arrayOf({ type: "string", enum: ["homework_not_done", "misunderstanding", "topic_mastered", "fast_progress"] }),
      proposals: arrayOf(ref("PlanAdjustmentSummary"))
    })
  }),
  StudentPlanResponse: objectSchema({
    plan: { anyOf: [ref("StudentPlanSummary"), { type: "null" }] }
  }),
  AnalyticsSummary: objectSchema({
    forecast_status: { type: "string", enum: ["on_track", "at_risk", "insufficient_data", "needs_official_scoring_data"] },
    forecast_reason: stringSchema,
    plan_completion: objectSchema({
      completed_lessons: integerSchema,
      total_lessons: integerSchema,
      percent: integerSchema
    }),
    homework_completion: objectSchema({
      completed_assignments: integerSchema,
      total_assignments: integerSchema,
      overdue_assignments: integerSchema,
      percent: integerSchema
    }),
    checked_attempt_accuracy: objectSchema({
      correct: integerSchema,
      checked: integerSchema,
      percent: integerSchema
    }),
    time_spent: objectSchema({
      total_seconds: integerSchema,
      average_seconds_per_attempt: integerSchema
    }),
    skill_mastery: arrayOf(ref("ProgressSummary")),
    prototype_mastery: arrayOf(objectSchema({
      prototype_id: stringSchema,
      value: integerSchema,
      risk_flag: optionalString
    })),
    recurring_errors: arrayOf(objectSchema({
      mistake_tag: stringSchema,
      count: integerSchema
    })),
    weekly_trends: arrayOf(objectSchema({
      week_start: stringSchema,
      attempts: integerSchema,
      checked_attempts: integerSchema,
      accuracy_percent: integerSchema,
      time_spent_seconds: integerSchema
    })),
    checkpoints: arrayOf(objectSchema({
      label: stringSchema,
      status: { type: "string", enum: ["done", "upcoming", "overdue"] }
    }))
  }),
  StudentAnalyticsResponse: objectSchema({
    analytics: ref("AnalyticsSummary")
  }),
  TeacherAnalyticsResponse: objectSchema({
    analytics: ref("AnalyticsSummary")
  }),
  UpdatePlanRequest: objectSchema({
    title: optionalString,
    strategy: optionalString,
    rationale: optionalString,
    goalSummary: optionalString,
    deadline: { anyOf: [optionalString, { type: "null" }] },
    sessionsPerWeek: { anyOf: [integerSchema, { type: "null" }] },
    sessionDurationMinutes: { anyOf: [integerSchema, { type: "null" }] },
    checkpoints: arrayOf(stringSchema),
    changeSummary: optionalString,
    lessons: arrayOf(objectSchema({
      id: optionalString,
      lessonNo: integerSchema,
      plannedDate: optionalString,
      title: stringSchema,
      lessonGoal: optionalString,
      topics: arrayOf(stringSchema),
      taskNumbers: arrayOf(stringSchema),
      prototypeIds: arrayOf(stringSchema),
      skillAtoms: arrayOf(stringSchema),
      status: optionalString,
      studentSummary: optionalString,
      teacherNotes: optionalString
    }))
  }, [])
};
