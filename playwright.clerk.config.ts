import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvFile } from "dotenv";
import { getClerkE2EIdentity } from "./scripts/lib/clerk-e2e-identities";

for (const pathname of [resolve(".env.local"), resolve(".env")]) {
  if (existsSync(pathname)) {
    loadEnvFile({ path: pathname, override: false });
  }
}

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||=
  process.env.E2E_CLERK_PUBLISHABLE_KEY;
process.env.CLERK_SECRET_KEY ||= process.env.E2E_CLERK_SECRET_KEY;

const baseURL =
  process.env.E2E_BASE_URL?.trim() ||
  "https://edu-ferma-web.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e-clerk",
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  workers: 1,
  outputDir: "test-results/clerk",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/clerk", open: "never" }]
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "production-smoke",
      testMatch: /production-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "clerk-setup",
      testMatch: /global\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "owner",
      testMatch: /owner\.spec\.ts/,
      dependencies: ["clerk-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: getClerkE2EIdentity("owner").storageStatePath
      }
    },
    {
      name: "teacher",
      testMatch: /teacher\.spec\.ts/,
      dependencies: ["clerk-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: getClerkE2EIdentity("teacher").storageStatePath
      }
    },
    {
      name: "student",
      testMatch: /student\.spec\.ts/,
      dependencies: ["clerk-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: getClerkE2EIdentity("student").storageStatePath
      }
    }
  ]
});
