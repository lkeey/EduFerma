import { expect, test } from "@playwright/test";

test("teacher can use teacher APIs but cannot use owner access", async ({
  page,
  request
}) => {
  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/teacher\/dashboard(?:\?|$)/);
  await expect(
    page
      .getByRole("heading", {
        name: "Кабинет преподавателя",
        exact: true
      })
      .first()
  ).toBeVisible();

  const [providerHealth, ownerAccess] = await Promise.all([
    request.get("/api/v1/teacher/publication-providers/health"),
    request.get("/api/v1/owner/access")
  ]);
  expect(providerHealth.status()).toBe(200);
  expect(ownerAccess.status()).toBe(403);

  await page.goto("/owner/access");
  await expect(page).toHaveURL(/\/forbidden(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Доступ закрыт", exact: true })
  ).toBeVisible();
});
