import { expect, test } from "@playwright/test";

const requiredOpenApiOperations: Array<[string, string]> = [
  ["/api/v1/access/status", "get"],
  ["/api/v1/owner/access", "get"],
  ["/api/v1/owner/access/{subjectId}", "get"],
  ["/api/v1/owner/access-requests/{requestId}/approve", "post"],
  ["/api/v1/owner/access-requests/{requestId}/reject", "post"],
  ["/api/v1/owner/users/{userId}/access", "patch"],
  ["/api/v1/teacher/imports", "get"],
  ["/api/v1/teacher/imports", "post"],
  ["/api/v1/teacher/imports/{importId}/analyze", "post"],
  ["/api/v1/teacher/imports/{importId}/apply", "post"],
  ["/api/v1/teacher/task-bank", "get"],
  ["/api/v1/teacher/students/{studentId}/plan", "patch"],
  ["/api/v1/teacher/students/{studentId}/plan/publish", "post"],
  ["/api/v1/teacher/students/{studentId}/plan/history", "get"],
  ["/api/v1/teacher/students/{studentId}/analytics", "get"],
  ["/api/v1/student/analytics", "get"],
  ["/api/v1/teacher/publications", "post"],
  ["/api/v1/teacher/publications/{postId}/schedule", "post"],
  ["/api/v1/teacher/publications/{postId}/cancel-schedule", "post"],
  ["/api/v1/teacher/publications/{postId}/retry", "post"],
  ["/api/v1/owner/publication-targets", "post"],
  ["/api/v1/teacher/publication-providers/health", "get"],
  ["/api/v1/internal/publications/process", "get"]
];

test("production health exposes safe integration readiness", async ({
  request
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    ok?: boolean;
    version?: string;
    database?: boolean;
    clerk?: boolean;
    integrations?: Record<string, boolean>;
  };

  expect(body.ok).toBe(true);
  const expectedCommitSha = process.env.E2E_EXPECTED_COMMIT_SHA?.trim();
  if (expectedCommitSha) {
    expect(body.version).toBe(expectedCommitSha);
  }
  expect(body.database).toBe(true);
  expect(body.clerk).toBe(true);
  expect(body.integrations).toMatchObject({
    privateBlobConfigured: true,
    telegramPublisherConfigured: true,
    telegramOwnerChatConfigured: true,
    telegramAllowedChatsConfigured: true,
    publicationCronConfigured: true
  });
});

test("production OpenAPI contains all feature groups", async ({ request }) => {
  const response = await request.get("/api/openapi.json");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    openapi?: string;
    components?: { securitySchemes?: Record<string, unknown> };
    paths?: Record<string, Record<string, unknown>>;
  };

  expect(body.openapi).toMatch(/^3\./);
  for (const [path, method] of requiredOpenApiOperations) {
    expect(body.paths?.[path]?.[method]).toBeDefined();
  }
  expect(body.components?.securitySchemes).toHaveProperty("clerkAuth");
  expect(body.components?.securitySchemes).toHaveProperty("cronSecret");
});

test("public landing and Clerk entrypoints do not redirect-loop", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EduFerma" })).toBeVisible();

  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);

  await page.goto("/sign-up");
  await expect(
    page.getByRole("heading", { name: "Регистрация в EduFerma" })
  ).toBeVisible();
});

test("internal and teacher endpoints reject anonymous requests", async ({
  request
}) => {
  const [cron, providerHealth] = await Promise.all([
    request.get("/api/v1/internal/publications/process"),
    request.get("/api/v1/teacher/publication-providers/health")
  ]);

  expect(cron.status()).toBe(401);
  expect(providerHealth.status()).toBe(401);
});
