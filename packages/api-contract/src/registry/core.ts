import type { RouteDefinition } from "./types";

export const corePreludeRouteDefinitions: RouteDefinition[] = [
  { path: "/api/health", method: "get", operationId: "getHealth", tags: ["Health"], summary: "Basic service health", public: true, responseSchema: "HealthResponse" },
  { path: "/api/health/db", method: "get", operationId: "getDatabaseHealth", tags: ["Health"], summary: "Protected database health", responseSchema: "DatabaseHealthResponse" },
  { path: "/api/docs", method: "get", operationId: "getApiDocs", tags: ["Docs"], summary: "Swagger UI API documentation", public: true, responseContentType: "text/html", responseSchema: "HtmlDocument" },
  { path: "/api/openapi.json", method: "get", operationId: "getOpenApiDocument", tags: ["Health"], summary: "OpenAPI JSON document", public: true, responseSchema: "OpenApiDocument" },
  { path: "/api/demo-auth/login", method: "get", operationId: "loginDemoAuth", tags: ["Auth"], summary: "Development-only demo auth login", public: true, responseSchema: "DemoAuthResponse" },
  { path: "/api/demo-auth/logout", method: "get", operationId: "logoutDemoAuth", tags: ["Auth"], summary: "Development-only demo auth logout", public: true, responseSchema: "DemoAuthResponse" },
  { path: "/api/student/attempts", method: "post", operationId: "submitStudentAttemptLegacy", tags: ["Attempts", "Student"], summary: "Legacy compatibility student attempt submit", requestBody: true, requestSchema: "LegacySubmitAttemptRequest", responseSchema: "AttemptResult" },
  { path: "/api/teacher/reviews", method: "post", operationId: "reviewTeacherAttemptLegacy", tags: ["Attempts", "Teacher"], summary: "Legacy compatibility teacher attempt review", requestBody: true, requestSchema: "LegacyReviewAttemptRequest", responseSchema: "AttemptReviewResponse" },
  { path: "/api/v1/me", method: "get", operationId: "getCurrentUser", tags: ["Auth"], summary: "Current user", responseSchema: "CurrentUserResponse" }
];

export const coreV1TailRouteDefinitions: RouteDefinition[] = [
  { path: "/api/v1/diagnostics", method: "get", operationId: "getDiagnosticsSnapshot", tags: ["Diagnostics"], summary: "Safe platform diagnostics snapshot", responseSchema: "DiagnosticsResponse" },
  { path: "/api/v1/task-bank", method: "get", operationId: "listTaskBank", tags: ["Tasks"], summary: "Student-safe task bank summary", responseSchema: "TaskBankResponse" }
];
