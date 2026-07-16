import type { RouteDefinition } from "./types";

export const teacherRouteDefinitions: RouteDefinition[] = [
  { path: "/api/v1/teacher/dashboard", method: "get", operationId: "getTeacherDashboard", tags: ["Teacher"], summary: "Teacher dashboard", responseSchema: "TeacherDashboardResponse" },
  { path: "/api/v1/teacher/students", method: "get", operationId: "listTeacherStudents", tags: ["Teacher"], summary: "Teacher students", responseSchema: "StudentsResponse" },
  { path: "/api/v1/teacher/students/{studentId}", method: "get", operationId: "getTeacherStudent", tags: ["Teacher"], summary: "Teacher student detail", responseSchema: "StudentResponse" },
  { path: "/api/v1/teacher/students/{studentId}/schedule", method: "get", operationId: "getTeacherStudentSchedule", tags: ["Schedule", "Teacher"], summary: "Teacher student schedule", responseSchema: "ScheduleResponse" },
  { path: "/api/v1/teacher/students/{studentId}/schedule", method: "post", operationId: "createTeacherStudentScheduleEvent", tags: ["Schedule", "Teacher"], summary: "Create schedule event", requestBody: true, requestSchema: "CreateScheduleEventRequest", responseSchema: "ScheduleEventResponse" },
  { path: "/api/v1/teacher/students/{studentId}/assignments", method: "get", operationId: "listTeacherStudentAssignments", tags: ["Assignments", "Teacher"], summary: "Teacher student assignments", responseSchema: "AssignmentsResponse" },
  { path: "/api/v1/teacher/task-bank", method: "get", operationId: "listTeacherTaskBank", tags: ["Tasks", "Teacher"], summary: "Teacher task bank with pagination, filtering, and sorting", responseSchema: "TeacherTaskBankResponse" },
  { path: "/api/v1/teacher/tasks/{taskId}", method: "get", operationId: "getTeacherTask", tags: ["Tasks", "Teacher"], summary: "Teacher task detail with answer and solution", responseSchema: "TeacherTaskResponse" },
  { path: "/api/v1/teacher/tasks/{taskId}", method: "patch", operationId: "updateTeacherTask", tags: ["Tasks", "Teacher"], summary: "Update teacher task", requestBody: true, requestSchema: "TeacherTaskPatchRequest", responseSchema: "TeacherTaskMutationResponse" },
  { path: "/api/v1/teacher/tasks/{taskId}", method: "delete", operationId: "deleteTeacherTask", tags: ["Tasks", "Teacher"], summary: "Delete or archive teacher task", requestBody: true, requestSchema: "DeleteTaskRequest", responseSchema: "TeacherTaskMutationResponse" },
  { path: "/api/v1/teacher/assignments", method: "get", operationId: "listTeacherAssignments", tags: ["Assignments", "Teacher"], summary: "Teacher assignments", responseSchema: "AssignmentsResponse" },
  { path: "/api/v1/teacher/assignments", method: "post", operationId: "createTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Create assignment", requestBody: true, requestSchema: "CreateAssignmentRequest", responseSchema: "AssignmentResponse" },
  { path: "/api/v1/teacher/assignments/{assignmentId}", method: "get", operationId: "getTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Teacher assignment detail with answer and solution", responseSchema: "TeacherAssignmentResponse" },
  { path: "/api/v1/teacher/assignments/{assignmentId}", method: "patch", operationId: "updateTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Update assignment", requestBody: true, requestSchema: "UpdateAssignmentRequest", responseSchema: "AssignmentResponse" },
  { path: "/api/v1/teacher/assignments/{assignmentId}/publish", method: "post", operationId: "publishTeacherAssignment", tags: ["Assignments", "Teacher"], summary: "Publish assignment", responseSchema: "AssignmentResponse" },
  { path: "/api/v1/teacher/attempts/pending-review", method: "get", operationId: "listTeacherPendingReviewAttempts", tags: ["Attempts", "Teacher"], summary: "Pending manual review attempts", responseSchema: "PendingReviewAttemptsResponse" },
  { path: "/api/v1/teacher/attempts/{attemptId}/review", method: "post", operationId: "reviewTeacherAttempt", tags: ["Attempts", "Teacher"], summary: "Review attempt", requestBody: true, requestSchema: "ReviewAttemptRequest", responseSchema: "AttemptReviewResponse" }
];
