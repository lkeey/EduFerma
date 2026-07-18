import { EduFermaApiClient } from "./client";
import { buildTeacherTaskBankPath, type TeacherTaskBankQueryInput } from "./imports";

export function createTeacherApi(client = new EduFermaApiClient()) {
  return {
    dashboard: () => client.get("/api/v1/teacher/dashboard"),
    students: () => client.get("/api/v1/teacher/students"),
    student: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}`),
    studentPlan: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/plan`),
    updateStudentPlan: (studentId: string, body: unknown) => client.patch(`/api/v1/teacher/students/${studentId}/plan`, body),
    publishStudentPlan: (studentId: string) => client.post(`/api/v1/teacher/students/${studentId}/plan/publish`),
    studentPlanHistory: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/plan/history`),
    previewStudentPlanFeedback: (studentId: string) => client.post(`/api/v1/teacher/students/${studentId}/plan/feedback-preview`, {}),
    applyStudentPlanAdjustment: (studentId: string, adjustmentId: string) =>
      client.post(`/api/v1/teacher/students/${studentId}/plan/adjustments/${adjustmentId}/apply`),
    studentAnalytics: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/analytics`),
    taskBank: (query: TeacherTaskBankQueryInput = {}) => client.get(buildTeacherTaskBankPath(query)),
    task: (taskId: string) => client.get(`/api/v1/teacher/tasks/${taskId}`),
    assignments: () => client.get("/api/v1/teacher/assignments"),
    assignment: (assignmentId: string) => client.get(`/api/v1/teacher/assignments/${assignmentId}`),
    createAssignment: (body: unknown) => client.post("/api/v1/teacher/assignments", body),
    updateAssignment: (assignmentId: string, body: unknown) => client.patch(`/api/v1/teacher/assignments/${assignmentId}`, body),
    publishAssignment: (assignmentId: string) => client.post(`/api/v1/teacher/assignments/${assignmentId}/publish`),
    pendingReview: () => client.get("/api/v1/teacher/attempts/pending-review"),
    reviewAttempt: (attemptId: string, body: unknown) => client.post(`/api/v1/teacher/attempts/${attemptId}/review`, body)
  };
}
