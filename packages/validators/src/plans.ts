import { z } from "zod";

const planStatusSchema = z.enum(["draft", "active", "superseded", "archived"]);
const adjustmentStatusSchema = z.enum(["proposed", "approved", "rejected", "applied"]);
const adjustmentTypeSchema = z.enum(["remediation", "slowdown", "check", "acceleration", "stretch"]);
const feedbackSignalSchema = z.enum(["homework_not_done", "misunderstanding", "topic_mastered", "fast_progress"]);
const forecastStatusSchema = z.enum(["on_track", "at_risk", "insufficient_data", "needs_official_scoring_data"]);

export const UpdatePlanLessonSchema = z.object({
  id: z.string().min(1).optional(),
  lessonNo: z.number().int().positive(),
  plannedDate: z.string().datetime().optional(),
  title: z.string().min(1),
  lessonGoal: z.string().optional(),
  topics: z.array(z.string().min(1)).default([]),
  taskNumbers: z.array(z.string().min(1)).default([]),
  prototypeIds: z.array(z.string().min(1)).default([]),
  skillAtoms: z.array(z.string().min(1)).default([]),
  status: z.string().optional(),
  studentSummary: z.string().optional(),
  teacherNotes: z.string().optional()
});

export const UpdatePlanRequestSchema = z.object({
  title: z.string().min(1).optional(),
  strategy: z.string().min(1).optional(),
  rationale: z.string().optional(),
  goalSummary: z.string().optional(),
  deadline: z.string().datetime().nullable().optional(),
  sessionsPerWeek: z.number().int().min(1).max(14).nullable().optional(),
  sessionDurationMinutes: z.number().int().min(15).max(480).nullable().optional(),
  checkpoints: z.array(z.string().min(1)).optional(),
  changeSummary: z.string().optional(),
  lessons: z.array(UpdatePlanLessonSchema).optional()
});

export const PlanLessonSchema = z.object({
  id: z.string(),
  lesson_no: z.number().int().positive(),
  planned_date: z.string().optional(),
  title: z.string(),
  lesson_goal: z.string().optional(),
  topics: z.array(z.string()),
  task_numbers: z.array(z.string()),
  prototype_ids: z.array(z.string()),
  skill_atoms: z.array(z.string()),
  status: z.string(),
  student_summary: z.string().optional(),
  teacher_notes: z.string().optional()
});

export const PlanSummarySchema = z.object({
  id: z.string(),
  student_id: z.string(),
  version_no: z.number().int().nonnegative(),
  status: planStatusSchema,
  title: z.string(),
  strategy: z.string(),
  learning_track: z.string(),
  goal_summary: z.string().optional(),
  deadline: z.string().optional(),
  sessions_per_week: z.number().int().positive().optional(),
  session_duration_minutes: z.number().int().positive().optional(),
  rationale: z.string().optional(),
  checkpoints: z.array(z.string()),
  lessons: z.array(PlanLessonSchema),
  milestones: z.array(z.string()),
  change_summary: z.string().optional(),
  published_at: z.string().optional(),
  superseded_at: z.string().optional()
});

export const PlanChangeEventSchema = z.object({
  id: z.string(),
  plan_id: z.string(),
  event_type: z.enum(["created", "updated", "review_requested", "approved", "applied", "superseded"]),
  status: z.enum(["pending", "recorded", "approved", "rejected", "applied"]),
  summary: z.string(),
  created_at: z.string(),
  approved_at: z.string().optional(),
  applied_at: z.string().optional()
});

export const PlanAdjustmentSchema = z.object({
  id: z.string(),
  plan_id: z.string(),
  adjustment_type: adjustmentTypeSchema,
  title: z.string(),
  details_md: z.string().optional(),
  status: adjustmentStatusSchema,
  signal: feedbackSignalSchema,
  created_at: z.string(),
  scheduled_for: z.string().optional(),
  reviewed_at: z.string().optional(),
  applied_at: z.string().optional()
});

export const TeacherPlanResponseSchema = z.object({
  draft_plan: PlanSummarySchema.nullable(),
  active_plan: PlanSummarySchema.nullable(),
  pending_adjustments: z.array(PlanAdjustmentSchema),
  recent_events: z.array(PlanChangeEventSchema)
});

export const PublishPlanResponseSchema = z.object({
  plan: PlanSummarySchema
});

export const PlanHistoryResponseSchema = z.object({
  history: z.array(PlanSummarySchema),
  change_events: z.array(PlanChangeEventSchema)
});

export const FeedbackPreviewResponseSchema = z.object({
  preview: z.object({
    plan_id: z.string(),
    signals: z.array(feedbackSignalSchema),
    proposals: z.array(PlanAdjustmentSchema)
  })
});

export const StudentPlanSummarySchema = PlanSummarySchema.omit({
  student_id: true,
  rationale: true,
  change_summary: true
}).extend({
  lessons: z.array(PlanLessonSchema.omit({ teacher_notes: true }))
});

export const StudentPlanResponseSchema = z.object({
  plan: StudentPlanSummarySchema.nullable()
});

export const AnalyticsSummarySchema = z.object({
  forecast_status: forecastStatusSchema,
  forecast_reason: z.string(),
  plan_completion: z.object({
    completed_lessons: z.number().int().nonnegative(),
    total_lessons: z.number().int().nonnegative(),
    percent: z.number().int().nonnegative()
  }),
  homework_completion: z.object({
    completed_assignments: z.number().int().nonnegative(),
    total_assignments: z.number().int().nonnegative(),
    overdue_assignments: z.number().int().nonnegative(),
    percent: z.number().int().nonnegative()
  }),
  checked_attempt_accuracy: z.object({
    correct: z.number().int().nonnegative(),
    checked: z.number().int().nonnegative(),
    percent: z.number().int().nonnegative()
  }),
  time_spent: z.object({
    total_seconds: z.number().int().nonnegative(),
    average_seconds_per_attempt: z.number().int().nonnegative()
  }),
  skill_mastery: z.array(z.object({
    skill_atom: z.string(),
    value: z.number().int().nonnegative()
  })),
  prototype_mastery: z.array(z.object({
    prototype_id: z.string(),
    value: z.number().int().nonnegative(),
    risk_flag: z.string().optional()
  })),
  recurring_errors: z.array(z.object({
    mistake_tag: z.string(),
    count: z.number().int().nonnegative()
  })),
  weekly_trends: z.array(z.object({
    week_start: z.string(),
    attempts: z.number().int().nonnegative(),
    checked_attempts: z.number().int().nonnegative(),
    accuracy_percent: z.number().int().nonnegative(),
    time_spent_seconds: z.number().int().nonnegative()
  })),
  checkpoints: z.array(z.object({
    label: z.string(),
    status: z.enum(["done", "upcoming", "overdue"])
  }))
});

export const StudentAnalyticsResponseSchema = z.object({
  analytics: AnalyticsSummarySchema
});

export const TeacherAnalyticsResponseSchema = z.object({
  analytics: AnalyticsSummarySchema
});

export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
