import type { RouteDefinition } from "./types";

export const planRouteDefinitions: RouteDefinition[] = [
  { path: "/api/v1/student/plan", method: "get", operationId: "getStudentPlan", tags: ["Plans", "Student"], summary: "Student-safe learning plan", responseSchema: "StudentPlanResponse" },
  { path: "/api/v1/student/analytics", method: "get", operationId: "getStudentAnalytics", tags: ["Analytics", "Student"], summary: "Student analytics summary", responseSchema: "StudentAnalyticsResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan", method: "get", operationId: "getTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Teacher draft and active plan view", responseSchema: "TeacherPlanResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan", method: "patch", operationId: "updateTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Update student draft plan", requestBody: true, requestSchema: "UpdatePlanRequest", responseSchema: "TeacherPlanResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan/publish", method: "post", operationId: "publishTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Publish current draft plan", responseSchema: "PublishPlanResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan/history", method: "get", operationId: "getTeacherStudentPlanHistory", tags: ["Plans", "Teacher"], summary: "Version history and change events", responseSchema: "PlanHistoryResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan/feedback-preview", method: "post", operationId: "previewTeacherStudentPlanFeedback", tags: ["Plans", "Teacher"], summary: "Generate deterministic feedback adjustments", responseSchema: "FeedbackPreviewResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan/adjustments/{adjustmentId}/apply", method: "post", operationId: "applyTeacherStudentPlanAdjustment", tags: ["Plans", "Teacher"], summary: "Apply a proposed adjustment to the current draft", responseSchema: "FeedbackPreviewResponse" },
  { path: "/api/v1/teacher/students/{studentId}/analytics", method: "get", operationId: "getTeacherStudentAnalytics", tags: ["Analytics", "Teacher"], summary: "Teacher student analytics", responseSchema: "TeacherAnalyticsResponse" }
];
