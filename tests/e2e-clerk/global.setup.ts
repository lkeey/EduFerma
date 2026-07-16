import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { getClerkE2EIdentities } from "../../scripts/lib/clerk-e2e-identities";

test.describe.configure({ mode: "serial" });

test("authenticate isolated Clerk role identities", async ({ browser }) => {
  requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  requireEnv("CLERK_SECRET_KEY");
  await clerkSetup();

  for (const identity of getClerkE2EIdentities()) {
    await mkdir(dirname(identity.storageStatePath), { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("/");
      await clerk.signIn({ page, emailAddress: identity.email });
      await page.goto(identity.homePath);
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(identity.homePath)}(?:\\?|$)`));
      await expect(
        page.getByRole("heading", { name: identity.heading, exact: true }).first()
      ).toBeVisible();
      await context.storageState({ path: identity.storageStatePath });
    } finally {
      await context.close();
    }
  }
});

function requireEnv(name: string) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required for Clerk E2E.`);
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
