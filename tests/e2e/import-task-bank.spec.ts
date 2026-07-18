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
  await page.goto(
    "/teacher/task-bank?pageSize=20&sort_order=desc&learning_track=ege_informatics&exam=%D0%95%D0%93%D0%AD&task_number=7&topic=%D0%93%D1%80%D0%B0%D1%84%D0%B8%D0%BA%D0%B8&prototype_id=ege_7_graph_reading&difficulty_level=basic&source_name=original&status=active"
  );

  await expect(page.getByRole("heading", { name: "Банк задач" })).toBeVisible();
  await expect(page.getByText(/Страница 1 из/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Учебный трек" })).toHaveValue("ege_informatics");
  await expect(page.getByRole("textbox", { name: "Экзамен" })).toHaveValue("ЕГЭ");
  await expect(page.getByRole("textbox", { name: "Номер задания" })).toHaveValue("7");
  await expect(page.getByRole("textbox", { name: "Тема" })).toHaveValue("Графики");
  await expect(page.getByRole("textbox", { name: "Прототип" })).toHaveValue("ege_7_graph_reading");
  await expect(page.getByRole("combobox", { name: "Сложность" })).toHaveValue("basic");
  await expect(page.getByRole("textbox", { name: "Источник" })).toHaveValue("original");
  await expect(page.getByRole("combobox", { name: "Статус" })).toHaveValue("active");
  await expect(page.getByText("Учительское решение: прочитать значение по оси Y.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Открыть источник" })).toHaveAttribute(
    "href",
    "https://edu-ferma-web.vercel.app"
  );

  const nextUrl = new URL(await page.getByRole("link", { name: "Вперёд" }).getAttribute("href") ?? "", page.url());
  expect(Object.fromEntries(nextUrl.searchParams.entries())).toMatchObject({
    learning_track: "ege_informatics",
    exam: "ЕГЭ",
    task_number: "7",
    topic: "Графики",
    prototype_id: "ege_7_graph_reading",
    difficulty_level: "basic",
    source_name: "original",
    status: "active",
    sort_order: "desc",
    page: "1"
  });

  const firstTaskCheckbox = page.getByRole("checkbox", { name: /Выбрать задачу/ }).first();
  await expect(firstTaskCheckbox).toBeVisible();
  await firstTaskCheckbox.check();
  await expect(page.getByText("Выбрано: 1")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Архивировать выбранные" }).click();
  await expect(page.getByText("Выбрано: 0")).toBeVisible();
  await expect(page.getByRole("row", { name: /demo-ege-7-graph/ })).toContainText(
    "archived",
  );
});

test("task bank keeps protected delete errors visible", async ({ page }) => {
  await page.route("**/api/v1/teacher/tasks/demo-task", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "CONFLICT",
          message: "Task is referenced by assignments; archive it instead"
        }
      })
    });
  });
  await page.goto("/teacher/task-bank");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Удалить" }).first().click();

  await expect(page.getByText("Task is referenced by assignments; archive it instead")).toBeVisible();
  await expect(page.getByText("demo-ege-7-graph")).toBeVisible();
});

test("import review shows dry-run evidence and summary, then reviews and applies a selected row", async ({ page }) => {
  const reviewJob = {
    id: "demo-import",
    status: "review_ready",
    dryRun: true,
    sourceType: "url",
    sourceUrl: "https://kompege.ru/task/7",
    sourceName: "Kompege",
    originalFilename: "7.html",
    byteSize: 2048,
    contentType: "text/html",
    sha256: "a".repeat(64),
    licenseStatus: "public_reference",
    parserVersion: "task-import-v1",
    summary: {
      counts: {
        ready: 1,
        needs_review: 1,
        duplicate: 2,
        applied: 0,
        added: 0,
        updated: 0,
        skipped: 1
      }
    },
    warnings: []
  };
  const reviewRow = {
    id: "demo-row",
    rowNo: 1,
    sourceTaskId: "kompege-7",
    status: "needs_review",
    errorMessage: "Проверьте извлечённый ответ",
    normalizedTask: {
      task_id: "kompege-7",
      task_number: "7",
      topic: "Графики",
      statement_md: "Определите значение функции по графику.",
      difficulty_level: "basic",
      answer: { answers: ["42"] }
    },
    evidence: [{
      id: "evidence-1",
      kind: "url",
      status: "verified",
      label: "Страница задания",
      url: "https://kompege.ru/task/7",
      byteSize: 2048,
      contentType: "text/html",
      licenseStatus: "public_reference",
      parserVersion: "task-import-v1",
      importedAt: "2026-07-18T12:00:00.000Z",
      capturedAt: "2026-07-18T11:59:00.000Z",
      checksum: "b".repeat(64)
    }]
  };

  await page.route(/\/api\/v1\/teacher\/imports\/demo-import$/, async (route) => {
    await route.fulfill({ json: { job: reviewJob } });
  });
  await page.route(/\/api\/v1\/teacher\/imports\/demo-import\/rows$/, async (route) => {
    await route.fulfill({ json: { rows: [reviewRow], total: 1 } });
  });
  await page.route(/\/api\/v1\/teacher\/imports\/demo-import\/rows\/demo-row$/, async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().postDataJSON()).toMatchObject({ status: "ready" });
    await route.fulfill({ json: { row: { ...reviewRow, status: "ready", errorMessage: null } } });
  });
  await page.route(/\/api\/v1\/teacher\/imports\/demo-import\/apply$/, async (route) => {
    expect(route.request().postDataJSON()).toEqual({ taskIds: ["kompege-7"] });
    await route.fulfill({
      json: {
        job: {
          ...reviewJob,
          status: "applied",
          dryRun: false,
          summary: { counts: { applied: 1, added: 1, updated: 0, skipped: 0 } }
        }
      }
    });
  });

  await page.goto("/teacher/imports/demo-import");
  await page.getByRole("button", { name: "Обновить обзор" }).click();

  await expect(page.getByText("Dry-run: да")).toBeVisible();
  await expect(page.getByText("task-import-v1").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "открыть URL" })).toHaveAttribute(
    "href",
    "https://kompege.ru/task/7"
  );
  await expect(page.getByText("Готово: 1")).toBeVisible();
  await expect(page.getByText("На проверку: 1")).toBeVisible();
  await expect(page.getByText("Дубликаты: 2")).toBeVisible();
  await expect(page.getByText("Пропущено: 1")).toBeVisible();
  await expect(page.getByText(/Страница задания · url · verified/)).toBeVisible();
  await expect(page.getByText(/license public_reference/)).toBeVisible();

  const review = page.getByRole("row", { name: /kompege-7/ });
  await review.getByText("Проверить и исправить строку 1").click();
  await review.getByRole("button", { name: "Сохранить и отметить готовой" }).click();
  await review.getByRole("checkbox", { name: "Выбрать строку 1 для применения" }).check();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Применить выбранные (1)" }).click();

  await expect(page.getByText("Dry-run: нет")).toBeVisible();
  await expect(page.getByText("Применено: 1")).toBeVisible();
  await expect(page.getByText("Добавлено: 1")).toBeVisible();
});
