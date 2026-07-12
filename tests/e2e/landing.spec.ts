import { expect, test, type Page } from "@playwright/test";

const expectLandingTopbarVisible = async (page: Page) => {
  const topbar = page.locator(".landing-topbar");
  await expect(topbar).toBeInViewport();
  await expect(topbar).toHaveCSS("position", "fixed");
  await expect
    .poll(() => topbar.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBe(0);
};

test("landing loads and exposes MVP entrypoints", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /EduFerma.*control room/ })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Telegram" })).toHaveAttribute(
    "href",
    /t\.me\/lkeyit/
  );
  await expect(page.getByRole("link", { name: /Открыть кабинет/ }).first()).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("link", { name: /Банк задач/ }).first()).toHaveAttribute("href", "/task-bank");
  await expect(page.getByRole("link", { name: /Открыть учеников/ })).toHaveAttribute(
    "href",
    "/dashboard/teacher/students"
  );
  await expect(page.getByRole("link", { name: /Открыть мои ДЗ/ })).toHaveAttribute(
    "href",
    "/dashboard/student/assignments"
  );
  await expect(page.getByRole("link", { name: /Открыть diagnostics/ })).toHaveAttribute("href", "/diagnostics");
  await expect(page.getByRole("link", { name: /Открыть Swagger/ })).toHaveAttribute("href", "/api/docs");

  const nav = page.locator(".landing-nav");
  await expect(nav.getByRole("link", { name: "Кабинет" })).toHaveAttribute("href", "/dashboard");
  await expect(nav.getByRole("link", { name: "Банк задач" })).toHaveAttribute("href", "/task-bank");
  await expect(nav.getByRole("link", { name: "Ученики" })).toHaveAttribute("href", "/dashboard/teacher/students");
  await expect(nav.getByRole("link", { name: "ДЗ учителя" })).toHaveAttribute(
    "href",
    "/dashboard/teacher/assignments"
  );
  await expect(nav.getByRole("link", { name: "ДЗ ученика" })).toHaveAttribute(
    "href",
    "/dashboard/student/assignments"
  );
  await expect(nav.getByRole("link", { name: "Diagnostics" })).toHaveAttribute("href", "/diagnostics");
  await expect(nav.getByRole("link", { name: "API docs" })).toHaveAttribute("href", "/api/docs");
});

test("landing anchor navigation still works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".landing-nav").getByRole("link", { name: "Кабинет" })).toHaveAttribute(
    "href",
    "/dashboard"
  );
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Банк задач" })).toHaveAttribute(
    "href",
    "/task-bank"
  );

  await page.locator(".landing-nav").getByRole("link", { name: "Отзывы" }).click();
  await expect(page).toHaveURL(/#reviews$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Отзывы" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /Публичный слой не обещает/ })).toBeVisible();
});

test("landing reduced-motion users keep anchor navigation state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.locator(".landing-nav").getByRole("link", { name: "Отзывы" }).click();
  await expect(page).toHaveURL(/#reviews$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Отзывы" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /Публичный слой не обещает/ })).toBeVisible();
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
  await expect(page.getByText("Графики").first()).toBeVisible();

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
