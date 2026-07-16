import type { RouteDefinition } from "./types";

export const teacherRouteDefinitions: RouteDefinition[] = [
  { path: "/api/v1/teacher/dashboard", method: "get", operationId: "getTeacherDashboard", tags: ["Teacher"], summary: "Teacher dashboard", responseSchema: "TeacherDashboardResponse" },
  { path: "/api/v1/teacher/students", method: "get", operationId: "listTeacherStudents", tags: ["Teacher"], summary: "Teacher students", responseSchema: "StudentsResponse" },
  { path: "/api/v1/teacher/students/{studentId}", method: "get", operationId: "getTeacherStudent", tags: ["Teacher"], summary: "Teacher student detail", responseSchema: "StudentResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan", method: "get", operationId: "getTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Teacher student plan", responseSchema: "PlanResponse" },
  { path: "/api/v1/teacher/students/{studentId}/plan", method: "patch", operationId: "updateTeacherStudentPlan", tags: ["Plans", "Teacher"], summary: "Update student plan metadata", requestBody: true, requestSchema: "UpdatePlanRequest", responseSchema: "PlanResponse" },
  { path: "/api/v1/teacher/students/{studentId}/schedule", method: "get", operationId: "getTeacherStudentSchedule", tags: ["Schedule", "Teacher"], summary: "Teacher student schedule", responseSchema: "ScheduleResponse" },
  { path: "/api/v1/teacher/students/{studentId}/schedule", method: "post", operationId: "createTeacherStudentScheduleEvent", tags: ["Schedule", "Teacher"], summary: "Create schedule event", requestBody: true, requestSchema: "CreateScheduleEventRequest", responseSchema: "ScheduleEventResponse" },
  { path: "/api/v1/teacher/students/{studentId}/assignments", method: "get", operationId: "listTeacherStudentAssignments", tags: ["Assignments", "Teacher"], summary: "Teacher student assignments", responseSchema: "AssignmentsResponse" },
  { path: "/api/v1/teacher/students/{studentId}/analytics", method: "get", operationId: "getTeacherStudentAnalytics", tags: ["Analytics", "Teacher"], summary: "Teacher student analytics", responseSchema: "ProgressResponse" },
  { path: "/api/v1/teacher/task-bank", method: "get", operationId: "listTeacherTaskBank", tags: ["Tasks", "Teacher"], summary: "Teacher task bank", responseSchema: "TeacherTaskBankResponse" },
  { path: "/api/v1/teacher/tasks/{taskId}", method: "get", operationId: "getTeacherTask", tags: ["Tasks", "Teacher"], summary: "Teacher task detail with answer and solution", responseSchema: "TeacherTaskResponse" },
  { path: "/api/v1/teacher/assignments", method: "get", operationId: "listTeacherAssignments", tags: ["Assignments", "Teacher"], summary: "Teacher assignments", responseSchema: "AssignmentsResponse" },
  { path: "/api/v1/teacher/assignments", method: "post", operationId: "createTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Create assignment", requestBody: true, requestSchema: "CreateAssignmentRequest", responseSchema: "AssignmentResponse" },
  { path: "/api/v1/teacher/assignments/{assignmentId}", method: "get", operationId: "getTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Teacher assignment detail with answer and solution", responseSchema: "TeacherAssignmentResponse" },
  { path: "/api/v1/teacher/assignments/{assignmentId}", method: "patch", operationId: "updateTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Update assignment", requestBody: true, requestSchema: "UpdateAssignmentRequest", responseSchema: "AssignmentResponse" },
  { path: "/api/v1/teacher/assignments/{assignmentId}/publish", method: "post", operationId: "publishTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Publish assignment", responseSchema: "AssignmentResponse" },
  { path: "/api/v1/teacher/attempts/pending-review", method: "get", operationId: "listTeacherPendingReviewAttempts", tags: ["Attempts", "Teacher"], summary: "Pending manual review attempts", responseSchema: "PendingReviewAttemptsResponse" },
  { path: "/api/v1/teacher/attempts/{attemptId}/review", method: "post", operationId: "reviewTeacherAttempt", tags: ["Attempts", "Teacher"], summary: "Review attempt", requestBody: true, requestSchema: "ReviewAttemptRequest", responseSchema: "AttemptReviewResponse" }
];
