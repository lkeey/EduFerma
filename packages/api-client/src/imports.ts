import { z } from "zod";
import {
  ApplyImportJobRequestSchema,
  BulkTaskRequestSchema,
  CreateImportJobRequestSchema,
  DeleteTaskRequestSchema,
  ImportJobResponseSchema,
  ImportJobsResponseSchema,
  ImportRowsResponseSchema,
  TeacherTaskBankQuerySchema,
  TeacherTaskBankResponseSchema,
  TeacherTaskBulkResponseSchema,
  TeacherTaskMutationResponseSchema,
  UpdateImportRowRequestSchema,
  TeacherTaskPatchRequestSchema
} from "@eduferma/validators";
import { EduFermaApiClient } from "./client";

export {
  ApplyImportJobRequestSchema,
  BulkTaskRequestSchema,
  CreateImportJobRequestSchema,
  DeleteTaskRequestSchema,
  ImportJobResponseSchema,
  ImportJobsResponseSchema,
  ImportRowsResponseSchema,
  TeacherTaskBankQuerySchema,
  TeacherTaskBankResponseSchema,
  TeacherTaskBulkResponseSchema,
  TeacherTaskMutationResponseSchema,
  UpdateImportRowRequestSchema,
  TeacherTaskPatchRequestSchema
};

export type ImportJobResponse = z.infer<typeof ImportJobResponseSchema>;
export type ImportJobsResponse = z.infer<typeof ImportJobsResponseSchema>;
export type ImportRowsResponse = z.infer<typeof ImportRowsResponseSchema>;
export type TeacherTaskBankQueryInput = z.input<typeof TeacherTaskBankQuerySchema>;

export function buildTeacherTaskBankPath(query: TeacherTaskBankQueryInput = {}) {
  const parsed = TeacherTaskBankQuerySchema.parse(query);
  const params = new URLSearchParams();

  for (const key of Object.keys(query) as Array<keyof TeacherTaskBankQueryInput>) {
    const value = parsed[key as keyof typeof parsed];
    if (value !== undefined && value !== "") params.set(key, String(value));
  }

  const encoded = params.toString();
  return `/api/v1/teacher/task-bank${encoded ? `?${encoded}` : ""}`;
}

export function createImportsApi(client = new EduFermaApiClient()) {
  return {
    listJobs: () => client.get("/api/v1/teacher/imports"),
    createJob: (body: unknown) => client.post("/api/v1/teacher/imports", body),
    getJob: (jobId: string) => client.get(`/api/v1/teacher/imports/${jobId}`),
    uploadJobFile: (jobId: string, body: BodyInit, headers?: HeadersInit) =>
      client.request(`/api/v1/teacher/imports/${jobId}/upload`, {
        method: "POST",
        body,
        headers
      }),
    analyzeJob: (jobId: string, body: unknown = {}) => client.post(`/api/v1/teacher/imports/${jobId}/analyze`, body),
    listRows: (jobId: string) => client.get(`/api/v1/teacher/imports/${jobId}/rows`),
    updateRow: (jobId: string, rowId: string, body: unknown) =>
      client.patch(`/api/v1/teacher/imports/${jobId}/rows/${rowId}`, body),
    applyJob: (jobId: string, body: unknown = {}) => client.post(`/api/v1/teacher/imports/${jobId}/apply`, body),
    taskBank: (query: TeacherTaskBankQueryInput = {}) => client.get(buildTeacherTaskBankPath(query)),
    updateTask: (taskId: string, body: unknown) => client.patch(`/api/v1/teacher/tasks/${taskId}`, body),
    deleteTask: (taskId: string, body?: unknown) =>
      client.request(`/api/v1/teacher/tasks/${taskId}`, {
        method: "DELETE",
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "content-type": "application/json" } : undefined
      }),
    bulkTasks: (body: unknown) => client.post("/api/v1/teacher/tasks/bulk", body)
  };
}
