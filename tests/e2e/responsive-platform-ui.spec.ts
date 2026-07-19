import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900, mode: "table" },
  { name: "compact desktop", width: 1024, height: 768, mode: "table" },
  { name: "tablet", width: 820, height: 1180, mode: "cards" },
  { name: "mobile", width: 390, height: 844, mode: "cards" }
] as const;

async function login(page: Page, role: "owner" | "teacher") {
  await page.goto(`/api/demo-auth/login?role=${role}`);
  await expect(page).toHaveURL(new RegExp(`/${role === "owner" ? "owner/access" : "teacher/dashboard"}`));
}

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }))).toEqual(expect.objectContaining({
    documentWidth: await page.evaluate(() => window.innerWidth),
    viewportWidth: await page.evaluate(() => window.innerWidth)
  }));
}

for (const viewport of viewports) {
  test(`task bank is responsive without document overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, "teacher");
    await page.goto("/teacher/task-bank");

    await expect(page.getByRole("heading", { name: "Банк задач" })).toBeVisible();
    await expectNoDocumentOverflow(page);

    if (viewport.width <= 1080) {
      const menuButton = page.getByRole("button", { name: "Открыть меню" });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
    }

    const navigation = page.getByRole("navigation", { name: "Навигация преподавателя" });
    await expect(navigation.getByRole("link", { name: "Банк задач" })).toHaveAttribute("aria-current", "page");

    if (viewport.mode === "table") {
      await expect(page.locator(".task-bank-table")).toBeVisible();
      await expect(page.locator(".task-bank-card-list")).toBeHidden();
    } else {
      await expect(page.locator(".task-bank-table-wrap")).toBeHidden();
      await expect(page.locator(".task-bank-card").first()).toBeVisible();
    }
  });
}

test("task drawer keeps full content and raw known-answer JSON out of the list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "teacher");
  await page.goto("/teacher/task-bank");

  await expect(page.getByText('{"answers":["42"]}', { exact: true })).toHaveCount(0);
  await expect(page.locator(".task-bank-table").getByText("42", { exact: true })).toBeVisible();
  await page.locator(".task-bank-table tbody tr").first().getByRole("button", { name: "Подробнее" }).click();

  const drawer = page.getByRole("dialog", { name: "Подробности задачи" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("paragraph").filter({ hasText: "Демо-задача: определите значение по графику." })).toBeVisible();
  await expect(drawer.getByText("Учительское решение: прочитать значение по оси Y.", { exact: true })).toBeVisible();
  await expect(drawer.getByText("42", { exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("owner keeps owner navigation and pending count inside teacher routes", async ({ page }) => {
  await page.route("**/api/v1/owner/access?status=pending", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ requests: [{ id: "one" }, { id: "two" }], users: [] })
    });
  });
  await login(page, "owner");
  await page.goto("/teacher/task-bank");

  const ownerNavigation = page.getByRole("navigation", { name: "Навигация owner" });
  await expect(ownerNavigation.getByRole("link", { name: /Доступ/ })).toBeVisible();
  await expect(ownerNavigation.getByLabel("Ожидают доступа: 2")).toBeVisible();
});

test("ordinary teacher never receives owner navigation or requests its count", async ({ page }) => {
  let ownerCountRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/owner/access?status=pending")) ownerCountRequests += 1;
  });
  await login(page, "teacher");
  await page.goto("/teacher/task-bank");

  await expect(page.getByRole("navigation", { name: "Навигация преподавателя" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Доступ/ })).toHaveCount(0);
  expect(ownerCountRequests).toBe(0);
});
