import { expect, test } from "@playwright/test";

const forbiddenStudentKeys =
  /^(answer|answerJson|answer_json|answerHash|answer_hash|solution|solutionMd|solution_md|teacherNotes|teacher_notes|localSourcePath|local_source_path)$/i;

test("student analytics and plan stay student-safe", async ({
  page,
  request
}) => {
  await page.goto("/student/dashboard");
  await expect(page).toHaveURL(/\/student\/dashboard(?:\?|$)/);
  await expect(
    page
      .getByRole("heading", { name: "Кабинет ученика", exact: true })
      .first()
  ).toBeVisible();

  const [analytics, plan, teacherTaskBank] = await Promise.all([
    request.get("/api/v1/student/analytics"),
    request.get("/api/v1/student/plan"),
    request.get("/api/v1/teacher/task-bank")
  ]);
  expect(analytics.status()).toBe(200);
  expect(plan.status()).toBe(200);
  expect(teacherTaskBank.status()).toBe(403);

  expect(findForbiddenKeys(await analytics.json())).toEqual([]);
  expect(findForbiddenKeys(await plan.json())).toEqual([]);

  await page.goto("/teacher/task-bank");
  await expect(page).toHaveURL(/\/forbidden(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Доступ закрыт", exact: true })
  ).toBeVisible();
});

function findForbiddenKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenKeys(item, `${path}[${index}]`)
    );
  }
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) => [
    ...(forbiddenStudentKeys.test(key) ? [`${path}.${key}`] : []),
    ...findForbiddenKeys(child, `${path}.${key}`)
  ]);
}
