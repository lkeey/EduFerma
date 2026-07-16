import { expect, test } from "@playwright/test";

test("teacher edits, previews, applies, and publishes a plan version", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=teacher");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);

  await page.goto("/teacher/students/demo-student/plan");
  await expect(page.getByRole("heading", { name: "Параметры черновика" })).toBeVisible();

  await page
    .getByRole("textbox", { name: "Стратегия" })
    .fill("Сохраняем базовый темп и добавляем смешанную практику.");
  await page.getByRole("spinbutton", { name: "Занятий в неделю" }).fill("3");
  await page.getByRole("spinbutton", { name: "Минут в занятии" }).fill("75");
  await page.getByRole("button", { name: "Сохранить черновик" }).click();
  await expect(page.getByRole("status")).toContainText("Черновик сохранён");

  await page.getByRole("button", { name: "Сформировать preview" }).click();
  await expect(page.getByRole("status")).toContainText("Сформировано предложений");
  await expect(page.getByText("Короткая проверка перед новым материалом")).toBeVisible();

  await page.getByRole("button", { name: "Применить предложение" }).first().click();
  await expect(page.getByRole("status")).toContainText("Корректировка применена");

  await page.getByRole("button", { name: "Опубликовать новую версию" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Опубликована неизменяемая версия v2"
  );
});

test("student analytics and plan stay free of teacher-only notes", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=student");
  await expect(page).toHaveURL(/\/student\/dashboard/);

  await page.goto("/student/plan");
  await expect(page.getByRole("heading", { name: "Мой план" })).toBeVisible();
  await expect(
    page.getByText("Только для преподавателя: приоритет на графики и таблицы.")
  ).toHaveCount(0);
  await expect(page.getByText("Сначала проверить, не путает ли оси.")).toHaveCount(0);
  await expect(page.getByText("2 в неделю")).toBeVisible();

  await page.goto("/student/progress");
  await expect(page.getByText("Статус траектории")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Еженедельный тренд" })).toBeVisible();
});
