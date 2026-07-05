import { expect, test } from "@playwright/test";

test("landing loads and exposes Telegram CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "lkeey" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Telegram/ })).toHaveAttribute("href", /t\.me\/lkeyit/);
});

test("student dashboard does not expose teacher answer controls", async ({ page }) => {
  await page.goto("/dashboard/student");
  await expect(page.getByText("Учительские ответы остаются закрытыми")).toBeVisible();
});
