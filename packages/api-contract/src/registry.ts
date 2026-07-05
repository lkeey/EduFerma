export type HttpMethod = "get" | "post" | "patch" | "put" | "delete";

export type RouteDefinition = {
  path: string;
  method: HttpMethod;
  operationId: string;
  tags: string[];
  summary: string;
  public?: boolean;
  requestBody?: boolean;
};

export const routeDefinitions: RouteDefinition[] = [
  { path: "/api/health", method: "get", operationId: "getHealth", tags: ["Health"], summary: "Basic service health", public: true },
  { path: "/api/health/db", method: "get", operationId: "getDatabaseHealth", tags: ["Health"], summary: "Protected database health" },
  { path: "/api/openapi.json", method: "get", operationId: "getOpenApiDocument", tags: ["Health"], summary: "OpenAPI JSON document", public: true },
  { path: "/api/demo-auth/login", method: "get", operationId: "loginDemoAuth", tags: ["Auth"], summary: "Development-only demo auth login", public: true },
  { path: "/api/demo-auth/logout", method: "get", operationId: "logoutDemoAuth", tags: ["Auth"], summary: "Development-only demo auth logout", public: true },
  { path: "/api/student/attempts", method: "post", operationId: "submitStudentAttemptLegacy", tags: ["Attempts", "Student"], summary: "Legacy compatibility student attempt submit", requestBody: true },
  { path: "/api/teacher/reviews", method: "post", operationId: "reviewTeacherAttemptLegacy", tags: ["Attempts", "Teacher"], summary: "Legacy compatibility teacher attempt review", requestBody: true },
  { path: "/api/v1/me", method: "get", operationId: "getCurrentUser", tags: ["Auth"], summary: "Current user" },
  { path: "/api/v1/student/dashboard", method: "get", operationId: "getStudentDashboard", tags: ["Student"], summary: "Student dashboard" },
  { path: "/api/v1/student/schedule", method: "get", operationId: "getStudentSchedule", tags: ["Schedule", "Student"], summary: "Student schedule" },
  { path: "/api/v1/student/plan", method: "get", operationId: "getStudentPlan", tags: ["Plans", "Student"], summary: "Student-safe learning plan" },
  { path: "/api/v1/student/assignments", method: "get", operationId: "listStudentAssignments", tags: ["Assignments", "Student"], summary: "Student assignments" },
  { path: "/api/v1/student/assignments/{assignmentId}", method: "get", operationId: "getStudentAssignment", tags: ["Assignments", "Student"], summary: "Student assignment detail" },
  { path: "/api/v1/student/tasks/{taskId}", method: "get", operationId: "getStudentTask", tags: ["Tasks", "Student"], summary: "Student-safe task detail" },
  { path: "/api/v1/student/tasks/{taskId}/attempts", method: "post", operationId: "submitStudentAttempt", tags: ["Attempts", "Student"], summary: "Submit student attempt", requestBody: true },
  { path: "/api/v1/student/progress", method: "get", operationId: "getStudentProgress", tags: ["Analytics", "Student"], summary: "Student progress" },
  { path: "/api/v1/teacher/dashboard", method: "get", operationId: "getTeacherDashboard", tags: ["Teacher"], summary: "Teacher dashboard" },
  { path: "/api/v1/teacher/students", method: "get", operationId: "listTeacherStudents", tags: ["Teacher"], summary: "Teacher students" },
  { path: "/api/v1/teacher/students/{studentId}", method: "get", operationId: "getTeacherStudent", tags: ["Teacher"], summary: "Teacher student detail" },
  { path: "/api/v1/teacher/students/{studentId}/plan", method: "get", operationId: "getTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Teacher student plan" },
  { path: "/api/v1/teacher/students/{studentId}/plan", method: "patch", operationId: "updateTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Update student plan metadata", requestBody: true },
  { path: "/api/v1/teacher/students/{studentId}/schedule", method: "get", operationId: "getTeacherStudentSchedule", tags: ["Schedule", "Teacher"], summary: "Teacher student schedule" },
  { path: "/api/v1/teacher/students/{studentId}/schedule", method: "post", operationId: "createTeacherStudentScheduleEvent", tags: ["Schedule", "Teacher"], summary: "Create schedule event", requestBody: true },
  { path: "/api/v1/teacher/students/{studentId}/assignments", method: "get", operationId: "listTeacherStudentAssignments", tags: ["Assignments", "Teacher"], summary: "Teacher student assignments" },
  { path: "/api/v1/teacher/students/{studentId}/analytics", method: "get", operationId: "getTeacherStudentAnalytics", tags: ["Analytics", "Teacher"], summary: "Teacher student analytics" },
  { path: "/api/v1/teacher/task-bank", method: "get", operationId: "listTeacherTaskBank", tags: ["Tasks", "Teacher"], summary: "Teacher task bank" },
  { path: "/api/v1/teacher/tasks/{taskId}", method: "get", operationId: "getTeacherTask", tags: ["Tasks", "Teacher"], summary: "Teacher task detail with answer and solution" },
  { path: "/api/v1/teacher/assignments", method: "post", operationId: "createTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Create assignment", requestBody: true },
  { path: "/api/v1/teacher/assignments/{assignmentId}", method: "patch", operationId: "updateTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Update assignment", requestBody: true },
  { path: "/api/v1/teacher/assignments/{assignmentId}/publish", method: "post", operationId: "publishTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Publish assignment" },
  { path: "/api/v1/teacher/attempts/pending-review", method: "get", operationId: "listTeacherPendingReviewAttempts", tags: ["Attempts", "Teacher"], summary: "Pending manual review attempts" },
  { path: "/api/v1/teacher/attempts/{attemptId}/review", method: "post", operationId: "reviewTeacherAttempt", tags: ["Attempts", "Teacher"], summary: "Review attempt", requestBody: true }
];

export function findRouteDefinition(path: string, method: HttpMethod) {
  return routeDefinitions.find((route) => route.path === path && route.method === method);
}
