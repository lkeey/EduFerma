import { expect, test } from "@playwright/test";

test("homework persists from teacher draft through student attempt and review", async ({
  request
}) => {
  const teacherHeaders = {
    "content-type": "application/json",
    "x-demo-role": "teacher"
  };
  const studentHeaders = {
    "content-type": "application/json",
    "x-demo-role": "student"
  };
  const title = `Manual review homework ${Date.now()}`;

  const createResponse = await request.post("/api/v1/teacher/assignments", {
    headers: teacherHeaders,
    data: {
      studentId: "demo-student",
      title,
      taskIds: ["demo-review-task"]
    }
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    assignment: { id: string; status: string };
  };
  expect(created.assignment.status).toBe("draft");

  const beforePublish = await request.get("/api/v1/student/assignments", {
    headers: studentHeaders
  });
  expect(beforePublish.status()).toBe(200);
  expect(JSON.stringify(await beforePublish.json())).not.toContain(
    created.assignment.id
  );

  const publishResponse = await request.post(
    `/api/v1/teacher/assignments/${created.assignment.id}/publish`,
    { headers: teacherHeaders, data: {} }
  );
  expect(publishResponse.status()).toBe(200);
  await expect(publishResponse.json()).resolves.toMatchObject({
    assignment: { id: created.assignment.id, status: "assigned" }
  });

  const studentList = await request.get("/api/v1/student/assignments", {
    headers: studentHeaders
  });
  expect(studentList.status()).toBe(200);
  expect(JSON.stringify(await studentList.json())).toContain(created.assignment.id);

  const detailResponse = await request.get(
    `/api/v1/student/assignments/${created.assignment.id}`,
    { headers: studentHeaders }
  );
  expect(detailResponse.status()).toBe(200);
  const serializedDetail = JSON.stringify(await detailResponse.json());
  expect(serializedDetail).toContain("demo-review-task");
  expect(serializedDetail).not.toContain("answer_json");
  expect(serializedDetail).not.toContain("solution_md");
  expect(serializedDetail).not.toContain("teacher_notes");
  expect(serializedDetail).not.toContain("local_source_path");

  const attemptResponse = await request.post(
    "/api/v1/student/tasks/demo-review-task/attempts",
    {
      headers: studentHeaders,
      data: {
        assignmentId: created.assignment.id,
        answer: "Полное обоснование решения",
        timeSpentSec: 123
      }
    }
  );
  expect(attemptResponse.status()).toBe(201);
  const attempt = (await attemptResponse.json()) as {
    attemptId: string;
    checkStatus: string;
  };
  expect(attempt.checkStatus).toBe("pending_review");

  const pendingResponse = await request.get(
    "/api/v1/teacher/attempts/pending-review",
    { headers: teacherHeaders }
  );
  expect(pendingResponse.status()).toBe(200);
  const pending = (await pendingResponse.json()) as {
    attempts: Array<{ id: string; timeSpentSec?: number }>;
  };
  expect(pending.attempts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: attempt.attemptId, timeSpentSec: 123 })
    ])
  );

  const reviewResponse = await request.post(
    `/api/v1/teacher/attempts/${attempt.attemptId}/review`,
    {
      headers: teacherHeaders,
      data: {
        isCorrect: true,
        scoreAwarded: 1,
        feedbackMd: "Аргументация принята.",
        mistakeTags: []
      }
    }
  );
  expect(reviewResponse.status()).toBe(200);
  await expect(reviewResponse.json()).resolves.toMatchObject({
    attempt: {
      id: attempt.attemptId,
      status: "checked",
      isCorrect: true,
      scoreAwarded: 1
    }
  });

  const afterReview = await request.get(
    "/api/v1/teacher/attempts/pending-review",
    { headers: teacherHeaders }
  );
  expect(afterReview.status()).toBe(200);
  expect(JSON.stringify(await afterReview.json())).not.toContain(
    attempt.attemptId
  );

  const protectedDelete = await request.delete(
    "/api/v1/teacher/tasks/demo-review-task?mode=delete",
    { headers: { "x-demo-role": "teacher" } }
  );
  expect(protectedDelete.status()).toBe(409);

  const archive = await request.delete(
    "/api/v1/teacher/tasks/demo-review-task?mode=archive",
    { headers: { "x-demo-role": "teacher" } }
  );
  expect(archive.status()).toBe(200);
  await expect(archive.json()).resolves.toMatchObject({
    task: { status: "archived" }
  });
});
