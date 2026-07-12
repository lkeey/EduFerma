import { expect, test, type Page } from "@playwright/test";

const expectLandingTopbarVisible = async (page: Page) => {
  const topbar = page.locator(".landing-topbar");
  await expect(topbar).toBeInViewport();
  await expect(topbar).toHaveCSS("position", "fixed");
  await expect
    .poll(() => topbar.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBe(0);
};

test("landing loads and exposes Telegram CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /EduFerma.*control room/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Записаться в Telegram" })).toHaveAttribute("href", /t\.me\/lkeyit/);
  await expect(page.getByRole("link", { name: /Войти в кабинет/ })).toHaveAttribute("href", "/sign-in");
  await expect(page.getByRole("link", { name: /Открыть базу задач/ })).toHaveAttribute("href", "/teacher/task-bank");

  await page.locator(".landing-nav").getByRole("link", { name: "API backstage" }).click();
  await expect(page).toHaveURL(/#backstage$/);
  await expect(page.getByRole("heading", { name: /^Swagger и versioned API/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Swagger UI" })).toHaveAttribute("href", "/api/docs");
});

test("landing anchor navigation works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator(".landing-nav").getByRole("link", { name: "Кабинет" }).click();
  await expect(page).toHaveURL(/#cabinet$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Кабинет" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /живой учебный пульт/ })).toBeVisible();

  await page.locator(".landing-nav").getByRole("link", { name: "База задач" }).click();
  await expect(page).toHaveURL(/#task-bank$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "База задач" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /Фильтры выглядят/ })).toBeVisible();
});

test("landing reduced-motion users keep anchor navigation state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.locator(".landing-nav").getByRole("link", { name: "API backstage" }).click();
  await expect(page).toHaveURL(/#backstage$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "API backstage" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /^Swagger и versioned API/ })).toBeVisible();
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
