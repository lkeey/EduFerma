import { EduFermaApiClient } from "./client";

export function createStudentApi(client = new EduFermaApiClient()) {
  return {
    dashboard: () => client.get("/api/v1/student/dashboard"),
    schedule: () => client.get("/api/v1/student/schedule"),
    plan: () => client.get("/api/v1/student/plan"),
    analytics: () => client.get("/api/v1/student/analytics"),
    assignments: () => client.get("/api/v1/student/assignments"),
    assignment: (assignmentId: string) => client.get(`/api/v1/student/assignments/${assignmentId}`),
    task: (taskId: string) => client.get(`/api/v1/student/tasks/${taskId}`),
    submitAttempt: (taskId: string, body: unknown) => client.post(`/api/v1/student/tasks/${taskId}/attempts`, body),
    progress: () => client.get("/api/v1/student/progress")
  };
}
