import { expect, test } from "@playwright/test";

const secretCanaries = [
  "e2e-cron-secret",
  "e2e-webhook-secret",
  "e2e-telegram-secret",
  "e2e-vk-secret",
  "e2e-vk-group"
];

test("wrong roles cannot use owner, plan, import, or publication APIs", async ({ request }) => {
  const studentHeaders = { "x-demo-role": "student" };
  const studentJsonHeaders = {
    ...studentHeaders,
    "content-type": "application/json"
  };
  const forbiddenResponses = await Promise.all([
    request.get("/api/v1/owner/access", { headers: studentHeaders }),
    request.get("/api/v1/teacher/imports", { headers: studentHeaders }),
    request.get("/api/v1/teacher/task-bank", { headers: studentHeaders }),
    request.get("/api/v1/teacher/students/demo-student/plan", {
      headers: studentHeaders
    }),
    request.get("/api/v1/teacher/students/demo-student/plan/history", {
      headers: studentHeaders
    }),
    request.post("/api/v1/teacher/students/demo-student/plan/feedback-preview", {
      headers: studentJsonHeaders,
      data: {}
    }),
    request.get("/api/v1/teacher/students/demo-student/analytics", {
      headers: studentHeaders
    }),
    request.get("/api/v1/teacher/publications", { headers: studentHeaders }),
    request.get("/api/v1/teacher/publication-providers/health", {
      headers: studentHeaders
    })
  ]);

  expect(forbiddenResponses.map((response) => response.status())).toEqual(
    new Array(forbiddenResponses.length).fill(403)
  );

  const teacherOwnerTarget = await request.get(
    "/api/v1/owner/publication-targets",
    { headers: { "x-demo-role": "teacher" } }
  );
  expect(teacherOwnerTarget.status()).toBe(403);
});

test("cron and Telegram webhook reject wrong secrets without disclosing canaries", async ({
  request
}) => {
  const [publicationCron, telegramCron, webhook] = await Promise.all([
    request.get("/api/v1/internal/publications/process", {
      headers: { authorization: "Bearer wrong-secret" }
    }),
    request.get("/api/integrations/telegram/posts/cron", {
      headers: { authorization: "Bearer wrong-secret" }
    }),
    request.post("/api/integrations/telegram/webhook", {
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "wrong-secret"
      },
      data: { update_id: 1 }
    })
  ]);

  expect(publicationCron.status()).toBe(401);
  expect(telegramCron.status()).toBe(401);
  expect(webhook.status()).toBe(401);

  for (const response of [publicationCron, telegramCron, webhook]) {
    assertNoSecrets(await response.text());
  }
});

test("public health and provider diagnostics expose readiness only", async ({ request }) => {
  const [health, providers] = await Promise.all([
    request.get("/api/health"),
    request.get("/api/v1/teacher/publication-providers/health", {
      headers: { "x-demo-role": "teacher" }
    })
  ]);

  expect(health.status()).toBe(200);
  expect(providers.status()).toBe(200);
  assertNoSecrets(await health.text());
  assertNoSecrets(await providers.text());
});

test("OpenAPI contains every mandatory feature operation and security scheme", async ({
  request
}) => {
  const response = await request.get("/api/openapi.json");
  expect(response.status()).toBe(200);
  const document = (await response.json()) as {
    components?: { securitySchemes?: Record<string, unknown> };
    paths?: Record<string, Record<string, unknown>>;
  };

  const requiredOperations: Array<[string, string]> = [
    ["/api/v1/access/status", "get"],
    ["/api/v1/owner/access", "get"],
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
    ["/api/v1/teacher/publications/{postId}/retry", "post"],
    ["/api/v1/internal/publications/process", "get"]
  ];

  for (const [path, method] of requiredOperations) {
    expect(document.paths?.[path]?.[method]).toBeDefined();
  }
  expect(document.components?.securitySchemes).toHaveProperty("clerkAuth");
  expect(document.components?.securitySchemes).toHaveProperty("cronSecret");
});

function assertNoSecrets(serialized: string) {
  for (const secret of secretCanaries) {
    expect(serialized).not.toContain(secret);
  }
}
