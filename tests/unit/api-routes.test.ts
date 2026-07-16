import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as demoAuthLogin } from "../../apps/web/src/app/api/demo-auth/login/route";
import { GET as demoAuthLogout } from "../../apps/web/src/app/api/demo-auth/logout/route";
import { GET as getHealth } from "../../apps/web/src/app/api/health/route";
import { GET as getOpenApiDocument } from "../../apps/web/src/app/api/openapi.json/route";
import { GET as getMe } from "../../apps/web/src/app/api/v1/me/route";
import { GET as getAccessStatus } from "../../apps/web/src/app/api/v1/access/status/route";
import { POST as approveOwnerAccessRequest } from "../../apps/web/src/app/api/v1/owner/access-requests/[requestId]/approve/route";
import { GET as getOwnerAccess } from "../../apps/web/src/app/api/v1/owner/access/route";
import { PATCH as patchOwnerUserAccess } from "../../apps/web/src/app/api/v1/owner/users/[userId]/access/route";
import { GET as getStudentDashboard } from "../../apps/web/src/app/api/v1/student/dashboard/route";
import { GET as getStudentAnalytics } from "../../apps/web/src/app/api/v1/student/analytics/route";
import { GET as getStudentPlan } from "../../apps/web/src/app/api/v1/student/plan/route";
import { GET as getStudentTask } from "../../apps/web/src/app/api/v1/student/tasks/[taskId]/route";
import { GET as getTeacherAssignment } from "../../apps/web/src/app/api/v1/teacher/assignments/[assignmentId]/route";
import { GET as getTeacherAssignments } from "../../apps/web/src/app/api/v1/teacher/assignments/route";
import { GET as getTeacherDashboard } from "../../apps/web/src/app/api/v1/teacher/dashboard/route";
import { GET as getTeacherStudentAnalytics } from "../../apps/web/src/app/api/v1/teacher/students/[studentId]/analytics/route";
import {
  GET as getTeacherStudentPlan,
  PATCH as updateTeacherStudentPlan
} from "../../apps/web/src/app/api/v1/teacher/students/[studentId]/plan/route";
import { POST as applyTeacherStudentPlanAdjustment } from "../../apps/web/src/app/api/v1/teacher/students/[studentId]/plan/adjustments/[adjustmentId]/apply/route";
import { POST as previewTeacherStudentPlanFeedback } from "../../apps/web/src/app/api/v1/teacher/students/[studentId]/plan/feedback-preview/route";
import { GET as getTeacherStudentPlanHistory } from "../../apps/web/src/app/api/v1/teacher/students/[studentId]/plan/history/route";
import { POST as publishTeacherStudentPlan } from "../../apps/web/src/app/api/v1/teacher/students/[studentId]/plan/publish/route";
import { GET as getTeacherTask } from "../../apps/web/src/app/api/v1/teacher/tasks/[taskId]/route";
import { setCurrentUserForAuthTests } from "../../apps/web/src/server/auth/session";

vi.mock("next/server", () => {
  class MockNextResponse extends Response {
    cookies = {
      set: (name: string, value: string, options?: { path?: string }) => {
        this.headers.append("set-cookie", `${name}=${value}; Path=${options?.path ?? "/"}`);
      },
      delete: (name: string) => {
        this.headers.append("set-cookie", `${name}=; Max-Age=0; Path=/`);
      }
    };

    static redirect(url: URL) {
      return new MockNextResponse(null, { status: 307, headers: { location: url.toString() } });
    }
  }

  return { NextResponse: MockNextResponse };
});

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

function apiRequest(pathname: string, headers?: HeadersInit, init: RequestInit = {}) {
  return new Request(`http://localhost${pathname}`, { ...init, headers });
}

function demoAuthRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    headers: new Headers({ host: parsedUrl.host }),
    nextUrl: parsedUrl
  };
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toMatchObject({ error: { code } });
}

describe("api route contracts", () => {
  beforeEach(() => {
    resetEnv();
    setCurrentUserForAuthTests(null);
  });

  afterEach(() => {
    resetEnv();
    setCurrentUserForAuthTests(null);
  });

  it("returns setup-required for protected endpoints when Clerk env is missing", async () => {
    const response = await getStudentDashboard(apiRequest("/api/v1/student/dashboard"));

    await expectError(response, 503, "SETUP_REQUIRED");
  });

  it("returns JSON 401 for unauthenticated API requests when Clerk env is configured", async () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    process.env.CLERK_SECRET_KEY = "sk_test";
    setCurrentUserForAuthTests(async () => null);

    const response = await getStudentDashboard(apiRequest("/api/v1/student/dashboard"));

    await expectError(response, 401, "UNAUTHORIZED");
  });

  it("keeps demo auth login redirecting to role dashboards", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await demoAuthLogin(demoAuthRequest("http://localhost/api/demo-auth/login?role=teacher") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/teacher/dashboard");
    expect(response.headers.get("set-cookie")).toContain("eduferma_demo_role=teacher");
  });

  it("keeps demo auth logout clearing the demo role cookie", async () => {
    const response = await demoAuthLogout(demoAuthRequest("http://localhost/api/demo-auth/logout") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/sign-in");
    expect(response.headers.get("set-cookie")).toContain("eduferma_demo_role=;");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it("keeps the teacher demo API role as teacher, not owner", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getMe(apiRequest("/api/v1/me", { "x-demo-role": "teacher" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user.role).toBe("teacher");
  });

  it("includes access status in /me and the dedicated access status endpoint", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const meResponse = await getMe(apiRequest("/api/v1/me", { "x-demo-role": "owner" }));
    const mePayload = await meResponse.json();
    const statusResponse = await getAccessStatus(apiRequest("/api/v1/access/status", { "x-demo-role": "owner" }));
    const statusPayload = await statusResponse.json();

    expect(meResponse.status).toBe(200);
    expect(mePayload.accessStatus).toMatchObject({ state: "active", currentRole: "owner" });
    expect(statusResponse.status).toBe(200);
    expect(statusPayload.accessStatus).toMatchObject({ state: "active", currentRole: "owner" });
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

  it("returns 403 when a non-owner calls an owner endpoint", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getOwnerAccess(apiRequest("/api/v1/owner/access", { "x-demo-role": "teacher" }));

    await expectError(response, 403, "FORBIDDEN");
  });

  it("serves the owner access overview for owner demo auth", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getOwnerAccess(apiRequest("/api/v1/owner/access", { "x-demo-role": "owner" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ requests: [], users: [] });
  });

  it("validates owner approval and user access mutation payloads before service execution", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const approveResponse = await approveOwnerAccessRequest(
      apiRequest("/api/v1/owner/access-requests/request_123/approve", {
        "x-demo-role": "owner",
        "content-type": "application/json"
      }),
      { params: Promise.resolve({ requestId: "request_123" }) }
    );
    const patchResponse = await patchOwnerUserAccess(
      new Request("http://localhost/api/v1/owner/users/db_123/access", {
        method: "PATCH",
        headers: { "x-demo-role": "owner", "content-type": "application/json" },
        body: JSON.stringify({ reason: "" })
      }),
      { params: Promise.resolve({ userId: "db_123" }) }
    );

    await expectError(approveResponse, 400, "VALIDATION_ERROR");
    await expectError(patchResponse, 400, "VALIDATION_ERROR");
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

  it("keeps student plan responses free of teacher-only rationale and notes", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getStudentPlan(apiRequest("/api/v1/student/plan", { "x-demo-role": "student" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.plan).not.toHaveProperty("student_id");
    expect(payload.plan).not.toHaveProperty("rationale");
    expect(payload.plan.lessons[0]).not.toHaveProperty("teacher_notes");
  });

  it("returns teacher plan payload with draft, active, history, and append-only adjustments", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getTeacherStudentPlan(
      apiRequest("/api/v1/teacher/students/demo-student/plan", { "x-demo-role": "teacher" }),
      { params: Promise.resolve({ studentId: "demo-student" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.draft_plan).toMatchObject({ status: "draft" });
    expect(payload.active_plan).toMatchObject({ status: "active" });
    expect(payload.pending_adjustments[0]).toMatchObject({ status: "proposed" });
    expect(payload.recent_events[0]).toHaveProperty("event_type");
  });

  it("updates plan goals, deadline, frequency, and rationale through the versioned teacher API", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await updateTeacherStudentPlan(
      apiRequest(
        "/api/v1/teacher/students/demo-student/plan",
        {
          "content-type": "application/json",
          "x-demo-role": "teacher"
        },
        {
          method: "PATCH",
          body: JSON.stringify({
            title: "Обновлённый план",
            goalSummary: "Уверенно закрыть базовые прототипы",
            deadline: "2027-06-01T00:00:00.000Z",
            sessionsPerWeek: 3,
            sessionDurationMinutes: 75,
            rationale: "Увеличиваем частоту после диагностики."
          })
        }
      ),
      { params: Promise.resolve({ studentId: "demo-student" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.draft_plan).toMatchObject({
      title: "Обновлённый план",
      goal_summary: "Уверенно закрыть базовые прототипы",
      deadline: "2027-06-01T00:00:00.000Z",
      sessions_per_week: 3,
      session_duration_minutes: 75,
      rationale: "Увеличиваем частоту после диагностики."
    });
  });

  it("publishes a new immutable version and exposes append-only history", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const publishResponse = await publishTeacherStudentPlan(
      apiRequest(
        "/api/v1/teacher/students/demo-student/plan/publish",
        { "x-demo-role": "teacher" },
        { method: "POST" }
      ),
      { params: Promise.resolve({ studentId: "demo-student" }) }
    );
    const published = await publishResponse.json();
    const historyResponse = await getTeacherStudentPlanHistory(
      apiRequest(
        "/api/v1/teacher/students/demo-student/plan/history",
        { "x-demo-role": "teacher" }
      ),
      { params: Promise.resolve({ studentId: "demo-student" }) }
    );
    const history = await historyResponse.json();

    expect(publishResponse.status).toBe(200);
    expect(published.plan).toMatchObject({ version_no: 2, status: "active" });
    expect(historyResponse.status).toBe(200);
    expect(history.history[0]).toMatchObject({ version_no: 1, status: "active" });
    expect(history.change_events[0]).toHaveProperty("created_at");
  });

  it("previews deterministic feedback and applies an adjustment only after teacher confirmation", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const previewResponse = await previewTeacherStudentPlanFeedback(
      apiRequest(
        "/api/v1/teacher/students/demo-student/plan/feedback-preview",
        { "x-demo-role": "teacher" },
        { method: "POST" }
      ),
      { params: Promise.resolve({ studentId: "demo-student" }) }
    );
    const preview = await previewResponse.json();
    const adjustmentId = preview.preview.proposals[0].id;
    const applyResponse = await applyTeacherStudentPlanAdjustment(
      apiRequest(
        `/api/v1/teacher/students/demo-student/plan/adjustments/${adjustmentId}/apply`,
        { "x-demo-role": "teacher" },
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          studentId: "demo-student",
          adjustmentId
        })
      }
    );
    const applied = await applyResponse.json();

    expect(previewResponse.status).toBe(200);
    expect(preview.preview.proposals[0]).toMatchObject({
      status: "proposed",
      signal: "topic_mastered"
    });
    expect(applyResponse.status).toBe(200);
    expect(applied.preview.proposals[0]).toMatchObject({
      id: adjustmentId,
      status: "applied"
    });
  });

  it("returns student analytics without exam score claims", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getStudentAnalytics(apiRequest("/api/v1/student/analytics", { "x-demo-role": "student" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.analytics.forecast_status).toBe("needs_official_scoring_data");
    expect(payload.analytics.forecast_reason).toContain("Официальных");
    expect(JSON.stringify(payload.analytics)).not.toContain("score");
  });

  it("returns teacher analytics summary through the scoped student route", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await getTeacherStudentAnalytics(
      apiRequest("/api/v1/teacher/students/demo-student/analytics", { "x-demo-role": "teacher" }),
      { params: Promise.resolve({ studentId: "demo-student" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.analytics).toMatchObject({
      plan_completion: expect.any(Object),
      homework_completion: expect.any(Object),
      checked_attempt_accuracy: expect.any(Object)
    });
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

  it("lists and returns teacher assignment detail for teacher-owned assignments", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const listResponse = await getTeacherAssignments(apiRequest("/api/v1/teacher/assignments", { "x-demo-role": "teacher" }));
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.assignments[0]).toMatchObject({ id: "demo-assignment" });

    const detailResponse = await getTeacherAssignment(apiRequest("/api/v1/teacher/assignments/demo-assignment", { "x-demo-role": "teacher" }), {
      params: Promise.resolve({ assignmentId: "demo-assignment" })
    });
    const detailPayload = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.assignment).toMatchObject({ id: "demo-assignment" });
    expect(detailPayload.tasks[0]).toMatchObject({
      answer_json: expect.any(Object),
      solution_md: expect.any(String)
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
