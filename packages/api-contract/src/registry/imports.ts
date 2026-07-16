import type { RouteDefinition } from "./types";

export const importRouteDefinitions: RouteDefinition[] = [
  {
    path: "/api/v1/teacher/imports",
    method: "get",
    operationId: "listTeacherImports",
    tags: ["Imports", "Teacher"],
    summary: "List teacher import jobs",
    responseSchema: "ImportJobsResponse"
  },
  {
    path: "/api/v1/teacher/imports",
    method: "post",
    operationId: "createTeacherImport",
    tags: ["Imports", "Teacher"],
    summary: "Create teacher import job",
    requestBody: true,
    requestSchema: "CreateImportJobRequest",
    responseSchema: "ImportJobResponse"
  },
  {
    path: "/api/v1/teacher/imports/{importId}",
    method: "get",
    operationId: "getTeacherImport",
    tags: ["Imports", "Teacher"],
    summary: "Get teacher import job",
    responseSchema: "ImportJobResponse"
  },
  {
    path: "/api/v1/teacher/imports/{importId}/upload",
    method: "post",
    operationId: "uploadTeacherImport",
    tags: ["Imports", "Teacher"],
    summary: "Upload source payload for a teacher import job",
    requestBody: true,
    requestContentType: "multipart/form-data",
    requestSchema: "ImportUploadRequest",
    responseSchema: "ImportJobResponse"
  },
  {
    path: "/api/v1/teacher/imports/{importId}/analyze",
    method: "post",
    operationId: "analyzeTeacherImport",
    tags: ["Imports", "Teacher"],
    summary: "Analyze a teacher import job without mutating the task bank",
    requestBody: true,
    requestSchema: "AnalyzeImportJobRequest",
    responseSchema: "ImportJobResponse"
  },
  {
    path: "/api/v1/teacher/imports/{importId}/rows",
    method: "get",
    operationId: "listTeacherImportRows",
    tags: ["Imports", "Teacher"],
    summary: "List rows for a teacher import job",
    responseSchema: "ImportRowsResponse"
  },
  {
    path: "/api/v1/teacher/imports/{importId}/rows/{rowId}",
    method: "patch",
    operationId: "updateTeacherImportRow",
    tags: ["Imports", "Teacher"],
    summary: "Review or edit a teacher import row",
    requestBody: true,
    requestSchema: "UpdateImportRowRequest",
    responseSchema: "ImportRowResponse"
  },
  {
    path: "/api/v1/teacher/imports/{importId}/apply",
    method: "post",
    operationId: "applyTeacherImport",
    tags: ["Imports", "Teacher"],
    summary: "Apply a reviewed teacher import transactionally",
    requestBody: true,
    requestSchema: "ApplyImportJobRequest",
    responseSchema: "ImportJobResponse"
  },
  {
    path: "/api/v1/teacher/tasks/bulk",
    method: "post",
    operationId: "bulkMutateTeacherTasks",
    tags: ["Tasks", "Teacher"],
    summary: "Bulk archive, delete, or mark teacher tasks",
    requestBody: true,
    requestSchema: "BulkTaskRequest",
    responseSchema: "TeacherTaskBulkResponse"
  }
];
