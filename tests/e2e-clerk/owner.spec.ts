import { expect, test } from "@playwright/test";

test("owner opens access management with an active owner account", async ({
  page,
  request
}) => {
  await page.goto("/owner/access");
  await expect(page).toHaveURL(/\/owner\/access(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Owner Access", exact: true }).first()
  ).toBeVisible();

  const response = await request.get("/api/v1/me");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    user: { role: "owner" },
    accessStatus: { state: "active", currentRole: "owner" }
  });
});
