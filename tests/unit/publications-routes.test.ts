import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GET as processPublicationsCron,
  POST as processPublications
} from "../../apps/web/src/app/api/v1/internal/publications/process/route";
import { DELETE as archiveOwnerTarget } from "../../apps/web/src/app/api/v1/owner/publication-targets/[targetId]/route";
import { GET as ownerTargets } from "../../apps/web/src/app/api/v1/owner/publication-targets/route";
import { GET as providerHealth } from "../../apps/web/src/app/api/v1/teacher/publication-providers/health/route";

const originalEnv = { ...process.env };

function request(path: string, options?: RequestInit) {
  return new Request(`http://localhost${path}`, options);
}

describe("publication route guards", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ENABLE_DEMO_AUTH;
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects internal publication processing without the cron secret", async () => {
    const response = await processPublications(request("/api/v1/internal/publications/process", { method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("SETUP_REQUIRED");
  });

  it("rejects internal publication processing with the wrong bearer token", async () => {
    process.env.CRON_SECRET = "right-secret";

    const response = await processPublications(request("/api/v1/internal/publications/process", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" }
    }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

  it("protects the GET cron endpoint used by Vercel and GitHub Actions", async () => {
    process.env.CRON_SECRET = "right-secret";

    const response = await processPublicationsCron(
      request("/api/v1/internal/publications/process?limit=5", {
        headers: { authorization: "Bearer wrong-secret" }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

  it("requires exact confirmation before runtime Telegram acceptance", async () => {
    process.env.CRON_SECRET = "right-secret";

    const response = await processPublications(
      request("/api/v1/internal/publications/process", {
        method: "POST",
        headers: {
          authorization: "Bearer right-secret",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          operation: "telegram_acceptance",
          confirmation: "send"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("keeps owner publication targets owner-only", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await ownerTargets(request("/api/v1/owner/publication-targets", {
      headers: { "x-demo-role": "teacher" }
    }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("FORBIDDEN");
  });

  it("keeps target archive owner-only and provider health teacher-only", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const archiveResponse = await archiveOwnerTarget(
      request("/api/v1/owner/publication-targets/demo-target", {
        method: "DELETE",
        headers: { "x-demo-role": "teacher" }
      }),
      { params: Promise.resolve({ targetId: "demo-target" }) }
    );
    const healthResponse = await providerHealth(
      request("/api/v1/teacher/publication-providers/health", {
        headers: { "x-demo-role": "student" }
      })
    );

    expect(archiveResponse.status).toBe(403);
    expect(healthResponse.status).toBe(403);
  });
});
