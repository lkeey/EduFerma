import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "RATE_LIMITED",
  "SETUP_REQUIRED",
  "INTERNAL_ERROR"
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional()
  })
});

export const IdParamSchema = z.object({
  id: z.string().min(1)
});

export const AssignmentIdParamSchema = z.object({
  assignmentId: z.string().min(1)
});

export const StudentIdParamSchema = z.object({
  studentId: z.string().min(1)
});

export const TaskIdParamSchema = z.object({
  taskId: z.string().min(1)
});

export const AttemptIdParamSchema = z.object({
  attemptId: z.string().min(1)
});

export const SubmitAttemptRequestSchema = z.object({
  assignmentId: z.string().min(1),
  answer: z.string().min(1),
  startedAt: z.string().optional(),
  timeSpentSec: z.number().int().nonnegative().optional()
});

export const LegacySubmitAttemptRequestSchema = SubmitAttemptRequestSchema.extend({
  taskId: z.string().min(1)
});

export const CreateAssignmentRequestSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(1),
  descriptionMd: z.string().optional(),
  dueAt: z.string().optional(),
  taskIds: z.array(z.string().min(1)).default([])
});

export const UpdateAssignmentRequestSchema = z.object({
  title: z.string().min(1).optional(),
  descriptionMd: z.string().optional(),
  dueAt: z.string().optional(),
  taskIds: z.array(z.string().min(1)).optional(),
  status: z.string().optional()
});

export const UpdatePlanRequestSchema = z.object({
  title: z.string().min(1).optional(),
  milestones: z.array(z.string().min(1)).optional(),
  lessonStatus: z.string().optional()
});

export const CreateScheduleEventRequestSchema = z.object({
  title: z.string().min(1),
  startsAt: z.string().optional(),
  durationMinutes: z.number().int().positive().default(60)
});

export const ReviewAttemptRequestSchema = z.object({
  isCorrect: z.boolean(),
  scoreAwarded: z.number().nonnegative().optional(),
  feedbackMd: z.string().optional(),
  mistakeTags: z.array(z.string().min(1)).default([])
});

export const LegacyReviewAttemptRequestSchema = ReviewAttemptRequestSchema.extend({
  attemptId: z.string().min(1)
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type SubmitAttemptRequest = z.infer<typeof SubmitAttemptRequestSchema>;
export type LegacySubmitAttemptRequest = z.infer<typeof LegacySubmitAttemptRequestSchema>;
export type CreateAssignmentRequest = z.infer<typeof CreateAssignmentRequestSchema>;
export type UpdateAssignmentRequest = z.infer<typeof UpdateAssignmentRequestSchema>;
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
export type CreateScheduleEventRequest = z.infer<typeof CreateScheduleEventRequestSchema>;
export type ReviewAttemptRequest = z.infer<typeof ReviewAttemptRequestSchema>;
export type LegacyReviewAttemptRequest = z.infer<typeof LegacyReviewAttemptRequestSchema>;
