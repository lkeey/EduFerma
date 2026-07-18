import { expect, test } from "@playwright/test";

test("owner approves, rejects, blocks, restores, and protects the last owner", async ({
  request
}) => {
  const ownerHeaders = {
    "content-type": "application/json",
    "x-demo-role": "owner"
  };
  const guestHeaders = {
    "x-demo-role": "guest",
    "x-demo-user-id": "e2e-new-subject",
    "x-demo-email": "e2e.new.student@example.com",
    "x-demo-name": "E2E New Student"
  };

  const pendingStatus = await request.get("/api/v1/access/status", {
    headers: guestHeaders
  });
  expect(pendingStatus.status()).toBe(200);
  await expect(pendingStatus.json()).resolves.toMatchObject({
    accessStatus: {
      state: "pending",
      subjectId: "e2e-new-subject",
      requestStatus: "pending"
    }
  });

  const overviewResponse = await request.get(
    "/api/v1/owner/access?q=e2e.new.student%40example.com&status=pending",
    { headers: ownerHeaders }
  );
  expect(overviewResponse.status()).toBe(200);
  const overview = (await overviewResponse.json()) as {
    requests: Array<{ id: string; subjectId: string }>;
  };
  const requestRow = overview.requests.find(
    (candidate) => candidate.subjectId === "e2e-new-subject"
  );
  expect(requestRow).toBeDefined();

  const lastOwnerProtection = await request.patch(
    "/api/v1/owner/users/demo-owner-user/access",
    {
      headers: ownerHeaders,
      data: { role: "teacher", reason: "Acceptance protection check" }
    }
  );
  expect(lastOwnerProtection.status()).toBe(409);

  const approveResponse = await request.post(
    `/api/v1/owner/access-requests/${requestRow!.id}/approve`,
    {
      headers: ownerHeaders,
      data: { role: "student", reason: "Verified dedicated E2E identity" }
    }
  );
  expect(approveResponse.status()).toBe(200);
  const approved = (await approveResponse.json()) as {
    request: { status: string };
    user: {
      userId: string;
      role: string;
      studentId: string | null;
      studentPublicCode: string | null;
      learningTrack: string | null;
    };
  };
  expect(approved.request.status).toBe("approved");
  expect(approved.user).toMatchObject({
    role: "student",
    learningTrack: "ege_informatics"
  });
  expect(approved.user.studentId).toBeTruthy();
  expect(approved.user.studentPublicCode).toMatch(/^STUDENT-/);

  const refreshedStatus = await request.get("/api/v1/access/status", {
    headers: guestHeaders
  });
  expect(refreshedStatus.status()).toBe(200);
  await expect(refreshedStatus.json()).resolves.toMatchObject({
    accessStatus: { state: "active", currentRole: "student" }
  });

  const blockResponse = await request.patch(
    `/api/v1/owner/users/${approved.user.userId}/access`,
    {
      headers: ownerHeaders,
      data: { isActive: false, reason: "Temporary acceptance block" }
    }
  );
  expect(blockResponse.status()).toBe(200);
  await expect(blockResponse.json()).resolves.toMatchObject({
    user: { isActive: false },
    accessStatus: { state: "blocked" }
  });

  const restoreResponse = await request.patch(
    `/api/v1/owner/users/${approved.user.userId}/access`,
    {
      headers: ownerHeaders,
      data: { isActive: true, reason: "Acceptance restore" }
    }
  );
  expect(restoreResponse.status()).toBe(200);
  await expect(restoreResponse.json()).resolves.toMatchObject({
    user: { isActive: true },
    accessStatus: { state: "active" }
  });

  const roleResponse = await request.patch(
    `/api/v1/owner/users/${approved.user.userId}/access`,
    {
      headers: ownerHeaders,
      data: { role: "teacher", reason: "Acceptance role change" }
    }
  );
  expect(roleResponse.status()).toBe(200);
  const roleChanged = (await roleResponse.json()) as {
    ownerConfirmationPhrase: string;
  };
  expect(roleChanged.ownerConfirmationPhrase).toContain(
    "e2e.new.student@example.com"
  );

  const unconfirmedOwner = await request.patch(
    `/api/v1/owner/users/${approved.user.userId}/access`,
    {
      headers: ownerHeaders,
      data: {
        role: "owner",
        reason: "Acceptance owner promotion",
        ownerConfirmation: "wrong phrase"
      }
    }
  );
  expect(unconfirmedOwner.status()).toBe(403);

  const confirmedOwner = await request.patch(
    `/api/v1/owner/users/${approved.user.userId}/access`,
    {
      headers: ownerHeaders,
      data: {
        role: "owner",
        reason: "Acceptance owner promotion",
        ownerConfirmation: roleChanged.ownerConfirmationPhrase
      }
    }
  );
  expect(confirmedOwner.status()).toBe(200);
  await expect(confirmedOwner.json()).resolves.toMatchObject({
    user: { role: "owner" }
  });

  const rejectResponse = await request.post(
    "/api/v1/owner/access-requests/demo-request-reject/reject",
    {
      headers: ownerHeaders,
      data: { reason: "Identity was not approved" }
    }
  );
  expect(rejectResponse.status()).toBe(200);
  await expect(rejectResponse.json()).resolves.toMatchObject({
    request: { status: "rejected", decisionReason: "Identity was not approved" }
  });

  const detailResponse = await request.get(
    "/api/v1/owner/access/e2e-new-subject",
    { headers: ownerHeaders }
  );
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()) as {
    history: Array<{ action: string; metadata: { reason?: string } }>;
  };
  expect(detail.history.map((event) => event.action)).toEqual(
    expect.arrayContaining([
      "approved",
      "blocked",
      "restored",
      "role_changed"
    ])
  );
  expect(detail.history.every((event) => event.metadata.reason)).toBe(true);
});
