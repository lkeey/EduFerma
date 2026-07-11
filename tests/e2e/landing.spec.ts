import { expect, test } from "@playwright/test";

test("landing loads and exposes Telegram CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /EduFerma.*control room/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Записаться в Telegram" })).toHaveAttribute("href", /t\.me\/lkeyit/);

  await page.getByRole("link", { name: "API backstage" }).click();
  await expect(page).toHaveURL(/#backstage$/);
  await expect(page.getByRole("heading", { name: /^Swagger и versioned API/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Swagger UI" })).toHaveAttribute("href", "/api/docs");
});

test("landing anchor navigation works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("link", { name: "База задач" }).click();
  await expect(page).toHaveURL(/#task-bank$/);
  await expect(page.getByRole("heading", { name: /Фильтры выглядят/ })).toBeVisible();
});

test("student cannot access teacher routes", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=student");
  await expect(page).toHaveURL(/\/student\/dashboard/);

  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/forbidden/);
  await expect(page.getByRole("heading", { name: "Доступ закрыт" })).toBeVisible();
});

test("teacher opens task bank and analytics", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=teacher");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);

  await page.goto("/teacher/task-bank");
  await expect(page.getByRole("heading", { name: "Банк задач" })).toBeVisible();
  await expect(page.getByText("Анализ программ").first()).toBeVisible();

  await page.goto("/teacher/students/demo_student_oge/analytics");
  await expect(page.getByRole("heading", { name: /Аналитика/ })).toBeVisible();
  await expect(page.getByText("skill_atoms")).toBeVisible();
});

test("student submits a short answer while answers stay hidden", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=student");
  await expect(page).toHaveURL(/\/student\/dashboard/);

  await page.goto("/student/tasks/task_oge_07_text?assignmentId=assignment_demo_1");
  await expect(page.getByText("Ответы и решения скрыты для ученика")).toBeVisible();
  await expect(page.getByText("8 бит = 1 байт")).toHaveCount(0);

  await page.getByLabel("Ответ").fill("байт");
  await page.getByRole("button", { name: "Отправить ответ" }).click();

  await expect(page.getByText("checked")).toBeVisible();
  await expect(page.getByText("Ответ принят, проверьте решение с преподавателем.")).toBeVisible();
});
