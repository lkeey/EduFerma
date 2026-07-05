import { EduFermaApiClient } from "./client";

export function createTeacherApi(client = new EduFermaApiClient()) {
  return {
    dashboard: () => client.get("/api/v1/teacher/dashboard"),
    students: () => client.get("/api/v1/teacher/students"),
    student: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}`),
    studentPlan: (studentId: string) => client.get(`/api/v1/teacher/students/${studentId}/plan`),
    updateStudentPlan: (studentId: string, body: unknown) => client.patch(`/api/v1/teacher/students/${studentId}/plan`, body),
    taskBank: () => client.get("/api/v1/teacher/task-bank"),
    task: (taskId: string) => client.get(`/api/v1/teacher/tasks/${taskId}`),
    createAssignment: (body: unknown) => client.post("/api/v1/teacher/assignments", body),
    updateAssignment: (assignmentId: string, body: unknown) => client.patch(`/api/v1/teacher/assignments/${assignmentId}`, body),
    publishAssignment: (assignmentId: string) => client.post(`/api/v1/teacher/assignments/${assignmentId}/publish`),
    pendingReview: () => client.get("/api/v1/teacher/attempts/pending-review"),
    reviewAttempt: (attemptId: string, body: unknown) => client.post(`/api/v1/teacher/attempts/${attemptId}/review`, body)
  };
}
