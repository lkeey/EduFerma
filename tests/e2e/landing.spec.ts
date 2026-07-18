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
  await expect(page.getByRole("heading", { name: "EduFerma" })).toBeVisible();
  await expect(page.getByLabel("Превью продукта EduFerma")).toBeVisible();

  const entryPanel = page.getByLabel("Быстрые входы EduFerma");
  await expect(entryPanel.getByRole("link", { name: /Кабинет/ })).toHaveAttribute("href", "/dashboard");
  await expect(entryPanel.getByRole("link", { name: /Банк задач/ })).toHaveAttribute("href", "/task-bank");
  await expect(entryPanel.getByRole("link", { name: /Ученики/ })).toHaveAttribute(
    "href",
    "/teacher/students"
  );
  await expect(entryPanel.getByRole("link", { name: /Задания/ })).toHaveAttribute(
    "href",
    "/teacher/assignments"
  );
  await expect(entryPanel.getByRole("link", { name: /Диагностика/ })).toHaveAttribute("href", "/diagnostics");
  await expect(entryPanel.getByRole("link", { name: "API docs" })).toHaveAttribute("href", "/api/docs");

  await expect(page.getByRole("link", { name: /Открыть кабинет/ })).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("link", { name: /Открыть банк задач/ })).toHaveAttribute("href", "/task-bank");
  await expect(page.getByRole("link", { name: /Открыть учеников/ })).toHaveAttribute(
    "href",
    "/teacher/students"
  );
  await expect(page.getByRole("link", { name: /Открыть задания/ })).toHaveAttribute(
    "href",
    "/teacher/assignments"
  );
  await expect(page.getByRole("link", { name: /Мои задания/ })).toHaveAttribute(
    "href",
    "/student/assignments"
  );
  await expect(page.getByRole("link", { name: /Открыть диагностику/ })).toHaveAttribute("href", "/diagnostics");

  const nav = page.locator(".landing-nav");
  await expect(nav.getByRole("link", { name: "Кабинет" })).toHaveAttribute("href", "#cabinet");
  await expect(nav.getByRole("link", { name: "Банк задач" })).toHaveAttribute("href", "#task-bank");
  await expect(nav.getByRole("link", { name: "Ученики" })).toHaveAttribute("href", "#students");
  await expect(nav.getByRole("link", { name: "Задания" })).toHaveAttribute("href", "#assignments");
  await expect(nav.getByRole("link", { name: "Диагностика" })).toHaveAttribute("href", "#diagnostics");
  await expect(nav.getByRole("link", { name: "API docs" })).toHaveAttribute("href", "/api/docs");
});

test("landing anchor navigation still works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".landing-nav").getByRole("link", { name: "Кабинет" })).toHaveAttribute(
    "href",
    "#cabinet"
  );
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Банк задач" })).toHaveAttribute(
    "href",
    "#task-bank"
  );

  await page.locator(".landing-nav").getByRole("link", { name: "Диагностика" }).click();
  await expect(page).toHaveURL(/#diagnostics$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Диагностика" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /Диагностика и API/ })).toBeVisible();
});

test("landing reduced-motion users keep anchor navigation state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.locator(".landing-nav").getByRole("link", { name: "Диагностика" }).click();
  await expect(page).toHaveURL(/#diagnostics$/);
  await expect(page.locator(".landing-nav").getByRole("link", { name: "Диагностика" })).toHaveAttribute(
    "aria-current",
    "location"
  );
  await expectLandingTopbarVisible(page);
  await expect(page.getByRole("heading", { name: /Диагностика и API/ })).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Выйти" })).toHaveAttribute("href", "/api/demo-auth/logout");

  await page.goto("/teacher/task-bank");
  await expect(page.getByRole("heading", { name: "Банк задач" })).toBeVisible();
  await expect(page.getByText("Графики").first()).toBeVisible();

  await page.goto("/teacher/students/demo_student_oge/analytics");
  await expect(page.getByRole("heading", { name: /Аналитика/ })).toBeVisible();
  await expect(page.getByText("skill_atoms")).toBeVisible();
});

test("dashboard logout clears demo session", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=student");
  await expect(page).toHaveURL(/\/student\/dashboard/);

  await page.getByRole("link", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/sign-in/);

  await page.goto("/student/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("student submits a short answer while answers stay hidden", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=student");
  await expect(page).toHaveURL(/\/student\/dashboard/);

  await page.goto(
    "/student/tasks/demo-ege-7-graph?assignmentId=demo-assignment"
  );
  await expect(page.getByText("Ответы и решения скрыты для ученика")).toBeVisible();
  await expect(
    page.getByText("Учительское решение: прочитать значение по оси Y.")
  ).toHaveCount(0);

  await page.getByLabel("Ответ").fill("41");
  await page.getByRole("button", { name: "Отправить ответ" }).click();

  await expect(page.getByText("checked")).toBeVisible();
  await expect(page.getByText("Ответ принят, проверьте решение с преподавателем.")).toBeVisible();
});
