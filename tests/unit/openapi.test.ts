import { describe, expect, it } from "vitest";
import { openApiDocument, routeDefinitions } from "@eduferma/api-contract";

describe("openapi contract", () => {
  it("documents every registered route and method", () => {
    for (const route of routeDefinitions) {
      expect(openApiDocument.paths[route.path]?.[route.method]).toBeTruthy();
    }
  });

  it("uses unique operation ids", () => {
    const operationIds = routeDefinitions.map((route) => route.operationId);
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  it("marks protected endpoints with security", () => {
    for (const route of routeDefinitions.filter((item) => !item.public)) {
      expect(openApiDocument.paths[route.path]?.[route.method]?.security).toBeTruthy();
    }
  });

  it("documents controlled auth and DB setup errors for protected endpoints", () => {
    for (const route of routeDefinitions.filter((item) => !item.public)) {
      const responses = openApiDocument.paths[route.path]?.[route.method]?.responses;
      expect(responses?.["401"]).toBeTruthy();
      expect(responses?.["403"]).toBeTruthy();
      expect(responses?.["503"]).toBeTruthy();
    }
  });

  it("uses named schemas for every api/v1 success response", () => {
    for (const route of routeDefinitions.filter((item) => item.path.startsWith("/api/v1"))) {
      const schema = openApiDocument.paths[route.path]?.[route.method]?.responses?.["200"]?.content?.["application/json"]?.schema;

      expect(schema).toHaveProperty("$ref");
      expect(schema?.$ref).not.toBe("#/components/schemas/GenericObject");
    }
  });

  it("uses named request schemas for mutating operations", () => {
    for (const route of routeDefinitions.filter((item) => item.requestBody)) {
      const schema = openApiDocument.paths[route.path]?.[route.method]?.requestBody?.content?.["application/json"]?.schema;

      expect(schema).toHaveProperty("$ref");
      expect(schema?.$ref).not.toBe("#/components/schemas/GenericObject");
    }
  });

  it("documents student task payload without teacher-only fields", () => {
    const studentTask = openApiDocument.components.schemas.StudentTask;
    const teacherTask = openApiDocument.components.schemas.TeacherTask;

    expect(studentTask.additionalProperties).toBe(false);
    expect(studentTask.properties).not.toHaveProperty("answer_json");
    expect(studentTask.properties).not.toHaveProperty("solution_md");
    expect(studentTask.properties).not.toHaveProperty("teacher_notes");
    expect(studentTask.properties).not.toHaveProperty("local_source_path");
    expect(teacherTask.properties).toHaveProperty("answer_json");
    expect(teacherTask.properties).toHaveProperty("solution_md");
    expect(teacherTask.properties).toHaveProperty("teacher_notes");
    expect(teacherTask.properties).toHaveProperty("local_source_path");
  });

  it("documents task-bank summaries without teacher-only fields", () => {
    const taskSummary = openApiDocument.components.schemas.TaskSummary;
    const taskBank = openApiDocument.components.schemas.TaskBankResponse;

    expect(taskSummary.additionalProperties).toBe(false);
    expect(taskSummary.properties).not.toHaveProperty("answer_json");
    expect(taskSummary.properties).not.toHaveProperty("solution_md");
    expect(taskSummary.properties).not.toHaveProperty("teacher_notes");
    expect(taskSummary.properties).not.toHaveProperty("local_source_path");
    expect(taskBank.properties.tasks.items.$ref).toBe("#/components/schemas/TaskSummary");
  });

  it("documents diagnostics as a safe snapshot without raw secret fields", () => {
    const diagnostics = openApiDocument.components.schemas.DiagnosticsResponse;
    const environment = openApiDocument.components.schemas.DiagnosticsEnvironmentSnapshot;
    const access = openApiDocument.components.schemas.DiagnosticsAccessSnapshot;

    expect(diagnostics.properties.safeForSharing.enum).toEqual([true]);
    expect(environment.properties).toEqual({
      clerkConfigured: { type: "boolean" },
      databaseConfigured: { type: "boolean" },
      ownerEmailConfigured: { type: "boolean" }
    });
    expect(access.properties.emailMasked).toEqual({ type: ["string", "null"] });
    expect(JSON.stringify(diagnostics)).not.toMatch(/token|secret|password|DATABASE_URL/i);
  });
});
