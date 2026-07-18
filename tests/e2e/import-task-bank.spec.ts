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

  await expect(page).toHaveURL(/\/teacher\/imports\/demo-import-\d+$/, {
    timeout: 20_000
  });
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
  await expect(
    page.getByRole("link", { name: "Открыть источник" }).first()
  ).toHaveAttribute(
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

test("URL import persists review, apply, duplicate warning, and idempotency", async ({
  page
}) => {
  const headers = {
    "content-type": "application/json",
    "x-demo-role": "teacher"
  };

  const unsafeResponse = await page.request.post("/api/v1/teacher/imports", {
    headers,
    data: {
      sourceType: "url",
      sourceUrl: "http://127.0.0.1:3000/private",
      sourceName: "Unsafe local URL"
    }
  });
  expect(unsafeResponse.status()).toBe(403);

  const createResponse = await page.request.post("/api/v1/teacher/imports", {
    headers,
    data: {
      sourceType: "url",
      sourceUrl: "https://kompege.ru/task/7",
      sourceName: "Kompege E2E",
      dryRun: true,
      licenseStatus: "public_reference"
    }
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    job: { id: string; status: string; dryRun: boolean };
  };
  expect(created.job).toMatchObject({ status: "uploaded", dryRun: true });

  const analyzeResponse = await page.request.post(
    `/api/v1/teacher/imports/${created.job.id}/analyze`,
    { headers, data: { parserVersion: "e2e-parser-v1" } }
  );
  expect(analyzeResponse.status()).toBe(200);
  await expect(analyzeResponse.json()).resolves.toMatchObject({
    job: {
      status: "review_ready",
      dryRun: true,
      parserVersion: "e2e-parser-v1",
      summary: {
        counts: { needs_review: 1, duplicate: 1, applied: 0 }
      },
      warnings: [expect.objectContaining({ code: "CANONICAL_DUPLICATE" })]
    }
  });

  const rowsResponse = await page.request.get(
    `/api/v1/teacher/imports/${created.job.id}/rows`,
    { headers }
  );
  expect(rowsResponse.status()).toBe(200);
  const rows = (await rowsResponse.json()) as {
    rows: Array<{
      id: string;
      status: string;
      normalizedTask: { task_id: string };
      evidence: Array<{ checksum: string; parserVersion: string }>;
    }>;
  };
  const reviewRow = rows.rows.find((row) => row.status === "needs_review");
  const duplicateRow = rows.rows.find((row) => row.status === "duplicate");
  expect(reviewRow).toBeDefined();
  expect(duplicateRow).toBeDefined();
  expect(reviewRow!.evidence[0]).toMatchObject({
    parserVersion: "e2e-parser-v1"
  });
  expect(reviewRow!.evidence[0].checksum).toHaveLength(64);

  const guardedApply = await page.request.post(
    `/api/v1/teacher/imports/${created.job.id}/apply`,
    {
      headers,
      data: { taskIds: [reviewRow!.normalizedTask.task_id] }
    }
  );
  expect(guardedApply.status()).toBe(409);

  const updateRow = await page.request.patch(
    `/api/v1/teacher/imports/${created.job.id}/rows/${reviewRow!.id}`,
    {
      headers,
      data: {
        status: "ready",
        errorCode: null,
        errorMessage: null,
        normalizedTask: {
          answer_json: { answers: ["43"] },
          verification_status: "checked",
          status: "active"
        }
      }
    }
  );
  expect(updateRow.status()).toBe(200);
  await expect(updateRow.json()).resolves.toMatchObject({
    row: { status: "ready", errorCode: null, errorMessage: null }
  });

  const applyResponse = await page.request.post(
    `/api/v1/teacher/imports/${created.job.id}/apply`,
    {
      headers,
      data: { taskIds: [reviewRow!.normalizedTask.task_id] }
    }
  );
  expect(applyResponse.status()).toBe(200);
  await expect(applyResponse.json()).resolves.toMatchObject({
    job: {
      status: "applied",
      dryRun: false,
      summary: { counts: { applied: 1, added: 1, skipped: 0 } }
    }
  });

  const repeatApply = await page.request.post(
    `/api/v1/teacher/imports/${created.job.id}/apply`,
    {
      headers,
      data: { taskIds: [reviewRow!.normalizedTask.task_id] }
    }
  );
  expect(repeatApply.status()).toBe(200);
  await expect(repeatApply.json()).resolves.toMatchObject({
    job: { summary: { counts: { applied: 1, added: 0, skipped: 1 } } }
  });

  const bankResponse = await page.request.get(
    `/api/v1/teacher/task-bank?topic=%D0%93%D1%80%D0%B0%D1%84%D0%B8%D0%BA%D0%B8&prototypeId=ege_7_graph_reading&sourceName=Kompege%20E2E`,
    { headers }
  );
  expect(bankResponse.status()).toBe(200);
  const bank = (await bankResponse.json()) as {
    total: number;
    tasks: Array<{ task_id: string; answer_json?: { answers?: string[] } }>;
  };
  expect(bank.total).toBe(1);
  expect(bank.tasks[0]).toMatchObject({
    task_id: reviewRow!.normalizedTask.task_id,
    answer_json: { answers: ["43"] }
  });
});

test("import review UI uses persisted evidence and applies a reviewed row", async ({
  page
}) => {
  const headers = {
    "content-type": "application/json",
    "x-demo-role": "teacher"
  };
  const createResponse = await page.request.post("/api/v1/teacher/imports", {
    headers,
    data: {
      sourceType: "url",
      sourceUrl: "https://kompege.ru/task/7",
      sourceName: "Kompege UI",
      dryRun: true,
      licenseStatus: "public_reference"
    }
  });
  const created = (await createResponse.json()) as { job: { id: string } };
  const analyzeResponse = await page.request.post(
    `/api/v1/teacher/imports/${created.job.id}/analyze`,
    {
      headers,
      data: { parserVersion: "ui-parser-v1" }
    }
  );
  expect(analyzeResponse.status()).toBe(200);

  await page.goto(`/teacher/imports/${created.job.id}`);

  await expect(page.getByText("Dry-run: да")).toBeVisible();
  await expect(page.getByText("ui-parser-v1").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "открыть URL" })).toHaveAttribute(
    "href",
    "https://kompege.ru/task/7"
  );
  await expect(page.getByText("На проверку: 1")).toBeVisible();
  await expect(page.getByText("Дубликаты: 1")).toBeVisible();
  await expect(page.getByText(/Kompege UI · url · verified/).first()).toBeVisible();
  await expect(page.getByText(/license public_reference/).first()).toBeVisible();

  const review = page.getByRole("row", { name: /demo-import-\d+-task-1/ });
  await review.getByText("Проверить и исправить строку 1").click();
  await review.getByLabel("Ответ").fill("44");
  await review.getByRole("button", { name: "Сохранить и отметить готовой" }).click();
  await review.getByRole("checkbox", { name: "Выбрать строку 1 для применения" }).check();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Применить выбранные (1)" }).click();

  await expect(page.getByText("Dry-run: нет")).toBeVisible();
  await expect(page.getByText("Применено: 1")).toBeVisible();
  await expect(page.getByText("Добавлено: 1")).toBeVisible();
});
