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

  const ssrfProbe = await request.post("/api/v1/teacher/imports", {
    headers: { "content-type": "application/json" },
    data: {
      sourceType: "url",
      sourceUrl: "http://127.0.0.1:3000/private",
      sourceName: "Production SSRF acceptance probe",
      dryRun: true
    }
  });
  expect(ssrfProbe.status()).toBe(400);

  await page.goto("/owner/access");
  await expect(page).toHaveURL(/\/forbidden(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Доступ закрыт", exact: true })
  ).toBeVisible();
});
