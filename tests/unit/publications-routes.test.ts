import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as processPublications } from "../../apps/web/src/app/api/v1/internal/publications/process/route";
import { GET as ownerTargets } from "../../apps/web/src/app/api/v1/owner/publication-targets/route";

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

  it("keeps owner publication targets owner-only", async () => {
    process.env.ENABLE_DEMO_AUTH = "true";

    const response = await ownerTargets(request("/api/v1/owner/publication-targets", {
      headers: { "x-demo-role": "teacher" }
    }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("FORBIDDEN");
  });
});
