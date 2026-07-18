import { expect, test } from "@playwright/test";

test("demo sign-up offers a guest entry and refreshes pending status", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { name: "Регистрация в EduFerma" })).toBeVisible();

  await page.getByRole("link", { name: "Продолжить как гость (pending)" }).click();
  await expect(page).toHaveURL(/\/access-pending$/);
  await expect(page.getByRole("heading", { name: "Доступ ожидает подтверждения" })).toBeVisible();
  await expect(page.getByText(/Текущий статус:/)).toContainText("missing");

  await page.getByRole("link", { name: "Обновить статус доступа" }).click();
  await expect(page).toHaveURL(/\/access-pending$/);
  await expect(page.getByText(/Текущий статус:/)).toContainText("missing");
});

test("guest can log out, switch to owner, and filter owner access", async ({ page }) => {
  await page.goto("/api/demo-auth/login?role=guest");
  await expect(page).toHaveURL(/\/access-pending$/);
  const guestMe = await page.request.get("/api/v1/me");
  expect(guestMe.status()).toBe(200);
  await expect(guestMe.json()).resolves.toMatchObject({
    user: { role: "guest" },
    accessStatus: { state: "missing" }
  });

  await page.getByRole("link", { name: "Выйти и войти другим" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("link", { name: "Войти как owner" }).click();
  await expect(page).toHaveURL(/\/owner\/access$/);
  const ownerMe = await page.request.get("/api/v1/me");
  expect(ownerMe.status()).toBe(200);
  await expect(ownerMe.json()).resolves.toMatchObject({ user: { role: "owner" } });
  await expect(page.getByRole("heading", { name: "Owner Access", exact: true }).first()).toBeVisible();

  await expect(page.getByRole("columnheader", { name: "User ID" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Регистрация" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Создан" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Clerk subject" })).toHaveCount(2);
  await expect(page.getByText(/требуют отдельного подтверждения браузера/)).toBeVisible();

  await page.getByLabel("Поиск owner access").fill("pending@example.com");
  await page.getByLabel("Статус запроса").selectOption("pending");
  await page.getByLabel("Роль аккаунта").selectOption("student");
  await page.getByLabel("Состояние аккаунта").selectOption("active");
  await page.getByRole("button", { name: "Фильтр" }).click();

  await expect(page).toHaveURL(
    /\/owner\/access\?q=pending%40example\.com&status=pending&role=student&active=active$/
  );
  await expect(page.getByLabel("Поиск owner access")).toHaveValue("pending@example.com");
  await expect(page.getByLabel("Статус запроса")).toHaveValue("pending");
  await expect(page.getByLabel("Роль аккаунта")).toHaveValue("student");
  await expect(page.getByLabel("Состояние аккаунта")).toHaveValue("active");
});
