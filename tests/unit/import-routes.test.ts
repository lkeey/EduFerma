import { describe, expect, it } from "vitest";
import { GET as listTeacherImports, POST as createTeacherImport } from "../../apps/web/src/app/api/v1/teacher/imports/route";
import { GET as getTeacherImport } from "../../apps/web/src/app/api/v1/teacher/imports/[importId]/route";
import { POST as uploadTeacherImport } from "../../apps/web/src/app/api/v1/teacher/imports/[importId]/upload/route";
import { POST as analyzeTeacherImport } from "../../apps/web/src/app/api/v1/teacher/imports/[importId]/analyze/route";
import { GET as listTeacherImportRows } from "../../apps/web/src/app/api/v1/teacher/imports/[importId]/rows/route";
import { PATCH as updateTeacherImportRow } from "../../apps/web/src/app/api/v1/teacher/imports/[importId]/rows/[rowId]/route";
import { POST as applyTeacherImport } from "../../apps/web/src/app/api/v1/teacher/imports/[importId]/apply/route";
import { GET as getTeacherTaskBank } from "../../apps/web/src/app/api/v1/teacher/task-bank/route";
import {
  DELETE as deleteTeacherTask,
  PATCH as patchTeacherTask
} from "../../apps/web/src/app/api/v1/teacher/tasks/[taskId]/route";
import { POST as bulkTeacherTasks } from "../../apps/web/src/app/api/v1/teacher/tasks/bulk/route";

function apiRequest(pathname: string, init: RequestInit = {}) {
  return new Request(`http://localhost${pathname}`, init);
}

describe("teacher import routes in demo mode", () => {
  it("creates and lists teacher import jobs for teacher role", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const createResponse = await createTeacherImport(
      apiRequest("/api/v1/teacher/imports", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({ sourceType: "url", sourceUrl: "https://kompege.ru/task/7" })
      })
    );
    const createPayload = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createPayload.job.status).toBe("uploaded");

    const listResponse = await listTeacherImports(
      apiRequest("/api/v1/teacher/imports", { headers: { "x-demo-role": "teacher" } })
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createPayload.job.id,
          sourceUrl: "https://kompege.ru/task/7",
          status: "uploaded",
          dryRun: true
        })
      ])
    );
  });

  it("accepts teacher task patch route for teacher role", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await patchTeacherTask(
      apiRequest("/api/v1/teacher/tasks/demo-ege-7-graph", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({ status: "archived" })
      }),
      { params: Promise.resolve({ taskId: "demo-ege-7-graph" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.task.task_id).toBe("demo-ege-7-graph");
  });

  it("rejects invalid server-side task-bank pagination", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";
    const response = await getTeacherTaskBank(
      apiRequest("/api/v1/teacher/task-bank?page=0&pageSize=1000", {
        headers: { "x-demo-role": "teacher" }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts all server-side task-bank filters", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";
    const params = new URLSearchParams({
      learningTrack: "ege_informatics",
      exam: "ЕГЭ",
      taskNumber: "7",
      topic: "Графики",
      prototypeId: "ege_7_graph_reading",
      difficultyLevel: "basic",
      sourceName: "original",
      status: "active"
    });
    const response = await getTeacherTaskBank(
      apiRequest(`/api/v1/teacher/task-bank?${params.toString()}`, {
        headers: { "x-demo-role": "teacher" }
      })
    );

    expect(response.status).toBe(200);
  });

  it("rejects import access for a student role", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";
    const response = await listTeacherImports(
      apiRequest("/api/v1/teacher/imports", { headers: { "x-demo-role": "student" } })
    );

    expect(response.status).toBe(403);
  });

  it("guards every import and task mutation route from the student role", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";
    const studentHeaders = { "x-demo-role": "student" };
    const studentJsonHeaders = { ...studentHeaders, "content-type": "application/json" };
    const importContext = { params: Promise.resolve({ importId: "import-1" }) };
    const rowContext = { params: Promise.resolve({ importId: "import-1", rowId: "row-1" }) };
    const taskContext = { params: Promise.resolve({ taskId: "task-1" }) };
    const responses = await Promise.all([
      getTeacherImport(apiRequest("/api/v1/teacher/imports/import-1", { headers: studentHeaders }), importContext),
      uploadTeacherImport(
        apiRequest("/api/v1/teacher/imports/import-1/upload", { method: "POST", headers: studentHeaders }),
        importContext
      ),
      analyzeTeacherImport(
        apiRequest("/api/v1/teacher/imports/import-1/analyze", {
          method: "POST",
          headers: studentJsonHeaders,
          body: "{}"
        }),
        importContext
      ),
      listTeacherImportRows(
        apiRequest("/api/v1/teacher/imports/import-1/rows", { headers: studentHeaders }),
        importContext
      ),
      updateTeacherImportRow(
        apiRequest("/api/v1/teacher/imports/import-1/rows/row-1", {
          method: "PATCH",
          headers: studentJsonHeaders,
          body: "{}"
        }),
        rowContext
      ),
      applyTeacherImport(
        apiRequest("/api/v1/teacher/imports/import-1/apply", {
          method: "POST",
          headers: studentJsonHeaders,
          body: "{}"
        }),
        importContext
      ),
      deleteTeacherTask(
        apiRequest("/api/v1/teacher/tasks/task-1", {
          method: "DELETE",
          headers: studentJsonHeaders,
          body: JSON.stringify({ mode: "archive" })
        }),
        taskContext
      ),
      bulkTeacherTasks(
        apiRequest("/api/v1/teacher/tasks/bulk", {
          method: "POST",
          headers: studentJsonHeaders,
          body: JSON.stringify({ action: "archive", taskIds: ["task-1"] })
        })
      )
    ]);

    expect(responses.map((response) => response.status)).toEqual(new Array(responses.length).fill(403));
  });
});
