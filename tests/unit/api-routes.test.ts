import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getHealth } from "../../apps/web/src/app/api/health/route";
import { GET as getOpenApiDocument } from "../../apps/web/src/app/api/openapi.json/route";
import { GET as getStudentDashboard } from "../../apps/web/src/app/api/v1/student/dashboard/route";
import { GET as getStudentTask } from "../../apps/web/src/app/api/v1/student/tasks/[taskId]/route";
import { GET as getTeacherDashboard } from "../../apps/web/src/app/api/v1/teacher/dashboard/route";
import { GET as getTeacherTask } from "../../apps/web/src/app/api/v1/teacher/tasks/[taskId]/route";

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_DATABASE_URL;
  delete process.env.edu_ferma_auth_CLERK_SECRET_KEY;
  delete process.env.ENABLE_DEMO_AUTH;
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_edu_ferma_auth_CLERK_PUBLISHABLE_KEY;
  delete process.env.OPENAPI_DOCS_ENABLED;
  delete process.env.OWNER_EMAIL;
}

function apiRequest(pathname: string, headers?: HeadersInit) {
  return new Request(`http://localhost${pathname}`, { headers });
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toMatchObject({ error: { code } });
}

describe("api route contracts", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it("returns setup-required for protected endpoints when Clerk env is missing", async () => {
    const response = await getStudentDashboard(apiRequest("/api/v1/student/dashboard"));

    await expectError(response, 503, "SETUP_REQUIRED");
  });

  it("reports missing Clerk env names through public health without secret values", async () => {
    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.clerk).toBe(false);
    expect(payload.checks.clerk.missingEnv).toEqual(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]);
  });

  it("accepts Vercel Clerk marketplace aliases in public health", async () => {
    process.env.NEXT_PUBLIC_edu_ferma_auth_CLERK_PUBLISHABLE_KEY = "pk_alias";
    process.env.edu_ferma_auth_CLERK_SECRET_KEY = "sk_alias";

    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.clerk).toBe(true);
    expect(payload.checks.clerk.missingEnv).toEqual([]);
  });

  it("returns 403 when a student calls a teacher endpoint", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getTeacherDashboard(apiRequest("/api/v1/teacher/dashboard", { "x-demo-role": "student" }));

    await expectError(response, 403, "FORBIDDEN");
  });

  it("does not expose teacher-only task fields through student task routes", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getStudentTask(apiRequest("/api/v1/student/tasks/demo-ege-7-graph", { "x-demo-role": "student" }), {
      params: Promise.resolve({ taskId: "demo-ege-7-graph" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.task).toMatchObject({ task_id: "demo-ege-7-graph" });
    expect(payload.task).not.toHaveProperty("answer_json");
    expect(payload.task).not.toHaveProperty("solution_md");
    expect(payload.task).not.toHaveProperty("teacher_notes");
    expect(payload.task).not.toHaveProperty("local_source_path");
  });

  it("keeps teacher-only task fields available through teacher task routes", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getTeacherTask(apiRequest("/api/v1/teacher/tasks/demo-ege-7-graph"), {
      params: Promise.resolve({ taskId: "demo-ege-7-graph" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.task).toMatchObject({
      task_id: "demo-ege-7-graph",
      answer_json: { answers: ["42"] },
      solution_md: expect.any(String),
      teacher_notes: expect.any(String),
      local_source_path: expect.any(String)
    });
  });

  it("maps DB setup errors to a controlled 503 after auth succeeds", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";
    process.env.DATABASE_URL = "file:./local.db";

    const response = await getStudentDashboard(apiRequest("/api/v1/student/dashboard", { "x-demo-role": "student" }));

    await expectError(response, 503, "SETUP_REQUIRED");
  });

  it("does not allow demo auth as a production API fallback", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";
    process.env.NODE_ENV = "production";

    const response = await getStudentDashboard(apiRequest("/api/v1/student/dashboard", { "x-demo-role": "student" }));

    await expectError(response, 503, "SETUP_REQUIRED");
  });

  it("serves OpenAPI JSON when docs are enabled", async () => {
    const response = await getOpenApiDocument();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.paths["/api/v1/student/tasks/{taskId}"].get.operationId).toBe("getStudentTask");
  });

  it("hides OpenAPI JSON when docs are disabled", async () => {
    process.env.OPENAPI_DOCS_ENABLED = "false";

    const response = await getOpenApiDocument();

    await expectError(response, 404, "NOT_FOUND");
  });
});
