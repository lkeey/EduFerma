import { expect, test } from "@playwright/test";

const requiredOpenApiPaths = [
  "/api/v1/owner/access",
  "/api/v1/teacher/imports",
  "/api/v1/teacher/task-bank",
  "/api/v1/teacher/students/{studentId}/analytics",
  "/api/v1/student/analytics",
  "/api/v1/teacher/publications",
  "/api/v1/internal/publications/process"
];

test("production health exposes safe integration readiness", async ({
  request
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    ok?: boolean;
    database?: boolean;
    clerk?: boolean;
    integrations?: Record<string, boolean>;
  };

  expect(body.ok).toBe(true);
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
    paths?: Record<string, unknown>;
  };

  expect(body.openapi).toMatch(/^3\./);
  for (const path of requiredOpenApiPaths) {
    expect(body.paths).toHaveProperty(path);
  }
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
