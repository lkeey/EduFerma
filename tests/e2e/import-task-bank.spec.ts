import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=teacher");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);
});

test("teacher creates an import job and reaches the review screen", async ({ page }) => {
  await page.goto("/teacher/imports");
  await expect(page.getByRole("heading", { name: "Импорт задач" })).toBeVisible();
  await page.getByRole("combobox", { name: "Тип источника" }).selectOption("url");
  await page
    .getByRole("textbox", { name: "URL разрешённого источника" })
    .fill("https://kompege.ru/task/7");
  await expect(page.getByRole("button", { name: "Создать" })).toBeEnabled();
  await page.getByRole("button", { name: "Создать" }).click();

  await expect(page).toHaveURL(/\/teacher\/imports\/demo-import$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Загрузить" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Анализировать" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Строки импорта" })).toBeVisible();
});

test("task bank exposes server filters, visible selection and bulk archive", async ({ page }) => {
  await page.goto("/teacher/task-bank?pageSize=20&sort_order=desc");

  await expect(page.getByRole("heading", { name: "Банк задач" })).toBeVisible();
  await expect(page.getByText(/Страница 1 из/)).toBeVisible();

  const firstTaskCheckbox = page.getByRole("checkbox", { name: /Выбрать задачу/ }).first();
  await expect(firstTaskCheckbox).toBeVisible();
  await firstTaskCheckbox.check();
  await expect(page.getByText("Выбрано: 1")).toBeVisible();

  await page.getByRole("button", { name: "Архивировать выбранные" }).click();
  await expect(page.getByText("Выбрано: 0")).toBeVisible();
  await expect(page.getByRole("row", { name: /demo-ege-7-graph/ })).toContainText(
    "archived",
  );
});
