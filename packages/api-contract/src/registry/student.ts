import type { RouteDefinition } from "./types";

export const studentRouteDefinitions: RouteDefinition[] = [
  { path: "/api/v1/student/dashboard", method: "get", operationId: "getStudentDashboard", tags: ["Student"], summary: "Student dashboard", responseSchema: "StudentDashboardResponse" },
  { path: "/api/v1/student/schedule", method: "get", operationId: "getStudentSchedule", tags: ["Schedule", "Student"], summary: "Student schedule", responseSchema: "ScheduleResponse" },
  { path: "/api/v1/student/plan", method: "get", operationId: "getStudentPlan", tags: ["Plans", "Student"], summary: "Student-safe learning plan", responseSchema: "PlanResponse" },
  { path: "/api/v1/student/assignments", method: "get", operationId: "listStudentAssignments", tags: ["Assignments", "Student"], summary: "Student assignments", responseSchema: "AssignmentsResponse" },
  { path: "/api/v1/student/assignments/{assignmentId}", method: "get", operationId: "getStudentAssignment", tags: ["Assignments", "Student"], summary: "Student assignment detail", responseSchema: "StudentAssignmentResponse" },
  { path: "/api/v1/student/tasks/{taskId}", method: "get", operationId: "getStudentTask", tags: ["Tasks", "Student"], summary: "Student-safe task detail", responseSchema: "StudentTaskResponse" },
  { path: "/api/v1/student/tasks/{taskId}/attempts", method: "post", operationId: "submitStudentAttempt", tags: ["Attempts", "Student"], summary: "Submit student attempt", requestBody: true, requestSchema: "SubmitAttemptRequest", responseSchema: "AttemptResult" },
  { path: "/api/v1/student/progress", method: "get", operationId: "getStudentProgress", tags: ["Analytics", "Student"], summary: "Student progress", responseSchema: "ProgressResponse" }
];
