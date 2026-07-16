import { z } from "zod";
import { EduFermaApiClient } from "./client";

export const PlanLessonSchema = z.object({
  id: z.string(),
  lesson_no: z.number().int().nonnegative(),
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
  status: z.enum(["draft", "active", "superseded", "archived"]),
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
  adjustment_type: z.enum(["remediation", "slowdown", "check", "acceleration", "stretch"]),
  title: z.string(),
  details_md: z.string().optional(),
  status: z.enum(["proposed", "approved", "rejected", "applied"]),
  signal: z.enum(["homework_not_done", "misunderstanding", "topic_mastered", "fast_progress"]),
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

export const PlanHistoryResponseSchema = z.object({
  history: z.array(PlanSummarySchema),
  change_events: z.array(PlanChangeEventSchema)
});

export const FeedbackPreviewResponseSchema = z.object({
  preview: z.object({
    plan_id: z.string(),
    signals: z.array(z.enum(["homework_not_done", "misunderstanding", "topic_mastered", "fast_progress"])),
    proposals: z.array(PlanAdjustmentSchema)
  })
});

export const StudentPlanResponseSchema = z.object({
  plan: PlanSummarySchema.omit({
    student_id: true,
    rationale: true,
    change_summary: true
  }).extend({
    lessons: z.array(PlanLessonSchema.omit({ teacher_notes: true }))
  }).nullable()
});

export const AnalyticsSummarySchema = z.object({
  forecast_status: z.enum(["on_track", "at_risk", "insufficient_data", "needs_official_scoring_data"]),
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
  skill_mastery: z.array(z.object({ skill_atom: z.string(), value: z.number().int().nonnegative() })),
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

export const AnalyticsResponseSchema = z.object({
  analytics: AnalyticsSummarySchema
});

export function createPlansApi(client = new EduFermaApiClient()) {
  return {
    teacherPlan: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/plan`),
    updateTeacherPlan: (studentId: string, body: unknown) => client.patch(`/api/v1/teacher/students/${studentId}/plan`, body),
    publishTeacherPlan: (studentId: string) => client.post(`/api/v1/teacher/students/${studentId}/plan/publish`),
    teacherPlanHistory: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/plan/history`),
    teacherFeedbackPreview: (studentId: string) => client.post(`/api/v1/teacher/students/${studentId}/plan/feedback-preview`, {}),
    applyTeacherAdjustment: (studentId: string, adjustmentId: string) =>
      client.post(`/api/v1/teacher/students/${studentId}/plan/adjustments/${adjustmentId}/apply`),
    studentPlan: () => client.get("/api/v1/student/plan"),
    teacherAnalytics: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/analytics`),
    studentAnalytics: () => client.get("/api/v1/student/analytics")
  };
}
