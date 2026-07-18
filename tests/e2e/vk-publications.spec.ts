import { expect, test } from "@playwright/test";

test("VK provider contract fails safely and retry preserves revision history", async ({
  request
}) => {
  const ownerHeaders = {
    "content-type": "application/json",
    "x-demo-role": "owner"
  };
  const teacherHeaders = {
    "content-type": "application/json",
    "x-demo-role": "teacher"
  };
  const suffix = Date.now().toString(36);
  const targetResponse = await request.post(
    "/api/v1/owner/publication-targets",
    {
      headers: ownerHeaders,
      data: {
        slug: `vk-e2e-${suffix}`,
        title: `VK E2E ${suffix}`,
        provider: "vk",
        status: "active",
        config: { groupId: "demo-vk-group", recipientMode: "static" }
      }
    }
  );
  expect(targetResponse.status()).toBe(201);
  const target = (await targetResponse.json()) as { target: { id: string } };

  const healthResponse = await request.get(
    "/api/v1/teacher/publication-providers/health",
    { headers: teacherHeaders }
  );
  expect(healthResponse.status()).toBe(200);
  await expect(healthResponse.json()).resolves.toMatchObject({
    health: expect.arrayContaining([
      expect.objectContaining({ provider: "vk", status: "setup_required" })
    ])
  });

  const createResponse = await request.post("/api/v1/teacher/publications", {
    headers: teacherHeaders,
    data: {
      title: `VK acceptance ${suffix}`,
      bodyMd: "VK live delivery must remain disabled without production setup.",
      publishAllowed: true,
      targetIds: [target.target.id]
    }
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    publication: { id: string; revision: number };
  };

  const publishResponse = await request.post(
    `/api/v1/teacher/publications/${created.publication.id}/publish`,
    { headers: teacherHeaders, data: {} }
  );
  expect(publishResponse.status()).toBe(200);
  const published = (await publishResponse.json()) as {
    publication: {
      status: string;
      revision: number;
      deliveries: Array<{
        status: string;
        errorCode: string | null;
        providerMessageId: string | null;
      }>;
    };
  };
  expect(published.publication.status).toBe("failed");
  expect(published.publication.revision).toBe(1);
  expect(published.publication.deliveries).toEqual([
    expect.objectContaining({
      status: "failed",
      errorCode: "LIVE_SEND_DISABLED",
      providerMessageId: null
    })
  ]);

  const retryResponse = await request.post(
    `/api/v1/teacher/publications/${created.publication.id}/retry`,
    { headers: teacherHeaders, data: {} }
  );
  expect(retryResponse.status()).toBe(200);
  const retried = (await retryResponse.json()) as {
    publication: {
      id: string;
      duplicateOfPostId: string | null;
      revision: number;
      status: string;
      deliveries: Array<{ errorCode: string | null }>;
    };
  };
  expect(retried.publication.id).not.toBe(created.publication.id);
  expect(retried.publication.duplicateOfPostId).toBe(created.publication.id);
  expect(retried.publication.revision).toBe(2);
  expect(retried.publication.status).toBe("failed");
  expect(retried.publication.deliveries[0]?.errorCode).toBe(
    "LIVE_SEND_DISABLED"
  );
});
