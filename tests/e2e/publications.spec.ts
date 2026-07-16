import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("teacher creates, schedules, cancels, publishes, and retries a publication", async ({
  page
}) => {
  await page.goto("/api/demo-auth/login?role=teacher");
  await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 });

  await page.goto("/teacher/publications");
  await expect(
    page.getByRole("heading", { name: "Публикации", exact: true }).first()
  ).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Название").fill("E2E weekly digest");
  await page.getByLabel("Короткий анонс").fill("Короткий анонс");
  await page
    .getByLabel("Текст публикации")
    .fill("Материал недели для учеников и родителей.");
  await page.getByLabel("Аудитория").fill("students");
  await page
    .getByLabel("Публикация утверждена для отправки")
    .check();
  await page.getByLabel(/Demo owner private Telegram/).check();
  await page.getByRole("button", { name: "Создать черновик" }).click();
  await expect(page.getByText("Черновик публикации создан.")).toBeVisible({
    timeout: 20_000
  });

  const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
  const localScheduledFor = new Date(
    scheduledFor.getTime() - scheduledFor.getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("Отложить до").fill(localScheduledFor);
  await page.getByRole("button", { name: "Запланировать" }).click();
  await expect(
    page.getByText("Публикация поставлена в расписание.")
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "Отменить расписание" })
  ).toBeEnabled();

  await page.getByRole("button", { name: "Отменить расписание" }).click();
  await expect(
    page.getByText("Расписание публикации отменено.")
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Опубликовать" }).click();
  await expect(
    page.getByText("Публикация обработана. Проверьте статус доставки.")
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/demo-message-/).first()).toBeVisible();

  await page
    .getByRole("button", { name: "Повторить новой ревизией" })
    .click();
  await expect(
    page.getByText("Создана новая ревизия публикации.")
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/demo-message-.*-2/).first()).toBeVisible();
});

test("cron processor claims due publications once", async ({ request }) => {
  const targetsResponse = await request.get(
    "/api/v1/teacher/publication-targets",
    { headers: { "x-demo-role": "teacher" } }
  );
  expect(targetsResponse.status()).toBe(200);
  const targets = (await targetsResponse.json()) as {
    targets: Array<{ id: string }>;
  };
  expect(targets.targets).toHaveLength(1);

  const createResponse = await request.post(
    "/api/v1/teacher/publications",
    {
      headers: {
        "content-type": "application/json",
        "x-demo-role": "teacher"
      },
      data: {
        title: "Due cron publication",
        bodyMd: "This publication is due.",
        publishAllowed: true,
        targetIds: [targets.targets[0].id],
        scheduledFor: new Date(Date.now() - 60_000).toISOString()
      }
    }
  );
  expect(createResponse.status()).toBe(201);

  const firstProcess = await request.get(
    "/api/v1/internal/publications/process",
    { headers: { authorization: "Bearer e2e-cron-secret" } }
  );
  expect(firstProcess.status()).toBe(200);
  await expect(firstProcess.json()).resolves.toMatchObject({
    claimedCount: 1,
    sentCount: 1,
    failedCount: 0
  });

  const secondProcess = await request.get(
    "/api/v1/internal/publications/process",
    { headers: { authorization: "Bearer e2e-cron-secret" } }
  );
  expect(secondProcess.status()).toBe(200);
  await expect(secondProcess.json()).resolves.toMatchObject({
    claimedCount: 0,
    sentCount: 0
  });
});

test("publication APIs reject wrong roles and cron secrets", async ({
  request
}) => {
  const forbidden = await request.post("/api/v1/teacher/publications", {
    headers: {
      "content-type": "application/json",
      "x-demo-role": "student"
    },
    data: {
      title: "Forbidden",
      bodyMd: "Forbidden",
      publishAllowed: false,
      targetIds: []
    }
  });
  expect(forbidden.status()).toBe(403);

  const unauthorizedCron = await request.get(
    "/api/v1/internal/publications/process",
    { headers: { authorization: "Bearer wrong-secret" } }
  );
  expect(unauthorizedCron.status()).toBe(401);
});
