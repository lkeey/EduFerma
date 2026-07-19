import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.RESPONSIVE_E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "responsive-platform-ui.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure"
  },
  webServer: {
    command: `VERCEL_ENV=development ENABLE_DEMO_AUTH=true CRON_SECRET=e2e-cron-secret TELEGRAM_WEBHOOK_SECRET=e2e-webhook-secret TELEGRAM_BOT_TOKEN=e2e-telegram-secret TELEGRAM_OWNER_CHAT_ID=1001 TELEGRAM_ALLOWED_CHAT_IDS=1001 VK_ACCESS_TOKEN=e2e-vk-secret VK_GROUP_ID=e2e-vk-group NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY= NEXT_PUBLIC_APP_URL=http://127.0.0.1:${port} pnpm --filter @eduferma/web dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium-responsive",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "webkit-responsive",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});
