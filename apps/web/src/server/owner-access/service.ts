import { and, desc, eq, or, sql } from "drizzle-orm";
import type { AppRole } from "@eduferma/config";
import { normalizeAccessEmail, type AuthenticatedIdentity } from "@eduferma/core";
import type { ServiceUser } from "@eduferma/core/services";
import { accessRequests, auditEvents, getDb, students, users } from "@eduferma/db";
import type {
  AccessStatusSummary,
  ApproveAccessRequest,
  OwnerAccessDetailResponse,
  OwnerAccessOverviewResponse,
  OwnerManagedUser,
  OwnerUserAccessDetailResponse,
  OwnerUserAccessResponse,
  RejectAccessRequest,
  UpdateOwnerUserAccessRequest
} from "@eduferma/validators";
import { ApiError } from "@/server/api/responses";

type Db = ReturnType<typeof getDb>;
type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbExecutor = Db | DbTx;
type DbUser = typeof users.$inferSelect;
type DbStudent = typeof students.$inferSelect;
type DbAccessRequest = typeof accessRequests.$inferSelect;
type DbAuditEvent = typeof auditEvents.$inferSelect;

type OwnerAccessFilters = {
  q?: string;
  status?: "pending" | "approved" | "rejected";
  role?: Exclude<AppRole, "guest">;
  active?: "all" | "active" | "blocked";
};

type OwnerHistoryEvent = OwnerAccessDetailResponse["history"][number];

export async function refreshAccessRequestForUnknownIdentity(identity: AuthenticatedIdentity) {
  const db = getDb();
  const email = normalizeAccessEmail(identity.email);
  const now = new Date();

  await db
    .insert(accessRequests)
    .values({
      clerkSubject: identity.providerUserId,
      requesterEmail: email,
      requesterName: identity.name,
      requestKind: "access",
      status: "pending",
      lastSeenAt: now
    })
    .onConflictDoUpdate({
      target: accessRequests.clerkSubject,
      set: {
        requesterEmail: email,
        requesterName: identity.name,
        lastSeenAt: now,
        updatedAt: now
      }
    });
}

export async function getAccessStatusForUser(user: Pick<ServiceUser, "id" | "email">): Promise<AccessStatusSummary> {
  const db = getDb();
  const email = normalizeAccessEmail(user.email);
  const [request, account] = await Promise.all([
    db.query.accessRequests.findFirst({ where: (row) => eq(row.clerkSubject, user.id) }),
    db.query.users.findFirst({
      where: (row) => or(eq(row.clerkUserId, user.id), eq(row.authProviderUserId, user.id), eq(row.email, email))
    })
  ]);

  return deriveAccessStatus({
    clerkSubject: user.id,
    request,
    user: account
  });
}

export async function listOwnerAccess(actor: DbUser, filters: OwnerAccessFilters = {}): Promise<OwnerAccessOverviewResponse> {
  requireOwner(actor);
  const db = getDb();
  const [requestRows, userRows, studentRows] = await Promise.all([
    db.query.accessRequests.findMany({ orderBy: (row, { desc: sortDesc }) => [sortDesc(row.updatedAt), sortDesc(row.createdAt)] }),
    db.query.users.findMany({ orderBy: (row, { desc: sortDesc }) => [sortDesc(row.updatedAt), sortDesc(row.createdAt)] }),
    db.query.students.findMany({ orderBy: (row, { desc: sortDesc }) => [sortDesc(row.updatedAt)] })
  ]);

  const studentsByUserId = new Map(studentRows.filter((row) => row.userId).map((row) => [row.userId as string, row]));
  const usersById = new Map(userRows.map((row) => [row.id, row]));

  const requests = requestRows
    .map((row) => {
      const linkedUser = row.targetUserId ? usersById.get(row.targetUserId) ?? null : findUserForRequest(userRows, row);
      const student = linkedUser ? studentsByUserId.get(linkedUser.id) ?? null : null;
      return mapAccessRequestRow(row, linkedUser, student);
    })
    .filter((row) => matchesAccessRequestFilters(row, filters));

  const usersList = userRows
    .map((row) => mapManagedUser(row, studentsByUserId.get(row.id) ?? null))
    .filter((row) => matchesManagedUserFilters(row, filters));

  return { requests, users: usersList };
}

export async function getOwnerAccessRequestDetail(actor: DbUser, subjectId: string): Promise<OwnerAccessDetailResponse> {
  requireOwner(actor);
  const db = getDb();
  const request = await db.query.accessRequests.findFirst({ where: (row) => eq(row.clerkSubject, subjectId) });
  if (!request) {
    throw new ApiError(404, "NOT_FOUND", "Access request was not found");
  }

  const user = request.targetUserId
    ? await db.query.users.findFirst({ where: (row) => eq(row.id, request.targetUserId ?? "") })
    : findUserForRequest(await db.query.users.findMany(), request);
  const student = user ? await db.query.students.findFirst({ where: (row) => eq(row.userId, user.id) }) : null;
  const history = await getAccessHistory(db, request, user ?? null);

  return {
    request: mapAccessRequestRow(request, user ?? null, student ?? null),
    user: user ? mapManagedUser(user, student ?? null) : null,
    history,
    accessStatus: deriveAccessStatus({ clerkSubject: subjectId, request, user: user ?? null }),
    ownerConfirmationPhrase: getOwnerConfirmationPhrase(request.requesterEmail)
  };
}

export async function getOwnerUserAccessDetail(actor: DbUser, userId: string): Promise<OwnerUserAccessDetailResponse> {
  requireOwner(actor);
  const db = getDb();
  const user = await db.query.users.findFirst({ where: (row) => eq(row.id, userId) });
  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User was not found");
  }

  const student = await db.query.students.findFirst({ where: (row) => eq(row.userId, user.id) });
  const request = user.clerkUserId
    ? await db.query.accessRequests.findFirst({ where: (row) => eq(row.clerkSubject, user.clerkUserId ?? "") })
    : await db.query.accessRequests.findFirst({ where: (row) => eq(row.targetUserId, user.id) });
  const history = await getUserHistory(db, user, request ?? null);

  return {
    user: mapManagedUser(user, student ?? null),
    history,
    accessStatus: deriveAccessStatus({ clerkSubject: user.clerkUserId ?? user.authProviderUserId ?? null, request, user }),
    ownerConfirmationPhrase: getOwnerConfirmationPhrase(user.email)
  };
}

export async function approveOwnerAccessRequest(
  actor: DbUser,
  requestId: string,
  input: ApproveAccessRequest
): Promise<OwnerAccessDetailResponse> {
  requireOwner(actor);
  const subjectId = await getDb().transaction(async (tx) => {
    const request = await tx.query.accessRequests.findFirst({ where: (row) => eq(row.id, requestId) });
    if (!request) {
      throw new ApiError(404, "NOT_FOUND", "Access request was not found");
    }
    if (request.status !== "pending") {
      throw new ApiError(409, "CONFLICT", "Access request has already been decided");
    }

    if (input.role === "owner") {
      ensureOwnerConfirmation(input.ownerConfirmation, request.requesterEmail);
    }

    const now = new Date();
    const existingUser = request.targetUserId
      ? await tx.query.users.findFirst({ where: (row) => eq(row.id, request.targetUserId ?? "") })
      : findUserForRequest(await tx.query.users.findMany(), request);

    const displayName = request.requesterName?.trim() || existingUser?.displayName || deriveDisplayNameFromEmail(request.requesterEmail);
    const [user] = existingUser
      ? await tx
          .update(users)
          .set({
            clerkUserId: request.clerkSubject,
            authProviderUserId: request.clerkSubject,
            email: request.requesterEmail,
            displayName,
            role: input.role,
            isActive: true,
            blockedAt: null,
            blockedByUserId: null,
            blockReason: null,
            updatedAt: now
          })
          .where(eq(users.id, existingUser.id))
          .returning()
      : await tx
          .insert(users)
          .values({
            clerkUserId: request.clerkSubject,
            authProviderUserId: request.clerkSubject,
            email: request.requesterEmail,
            displayName,
            role: input.role,
            isActive: true
          })
          .returning();

    const student = input.role === "student" ? await ensureStudentProfile(tx, user, request) : null;

    await tx
      .update(accessRequests)
      .set({
        targetUserId: user.id,
        studentId: student?.id ?? request.studentId,
        requestedRole: input.role,
        status: "approved",
        reviewedByUserId: actor.id,
        reviewedAt: now,
        decisionNoteMd: input.reason,
        updatedAt: now
      })
      .where(eq(accessRequests.id, request.id));

    await insertAuditEvent(tx, {
      actorUserId: actor.id,
      subjectUserId: user.id,
      action: "access_request.approved",
      entityType: "access_request",
      entityId: request.id,
      metadata: {
        reason: input.reason,
        role: input.role,
        clerkSubject: request.clerkSubject,
        requesterEmail: request.requesterEmail,
        studentId: student?.id ?? null
      }
    });

    return request.clerkSubject;
  });

  return getOwnerAccessRequestDetail(actor, subjectId);
}

export async function rejectOwnerAccessRequest(
  actor: DbUser,
  requestId: string,
  input: RejectAccessRequest
): Promise<OwnerAccessDetailResponse> {
  requireOwner(actor);
  const subjectId = await getDb().transaction(async (tx) => {
    const request = await tx.query.accessRequests.findFirst({ where: (row) => eq(row.id, requestId) });
    if (!request) {
      throw new ApiError(404, "NOT_FOUND", "Access request was not found");
    }
    if (request.status !== "pending") {
      throw new ApiError(409, "CONFLICT", "Access request has already been decided");
    }

    const user = request.targetUserId
      ? await tx.query.users.findFirst({ where: (row) => eq(row.id, request.targetUserId ?? "") })
      : null;
    const now = new Date();

    await tx
      .update(accessRequests)
      .set({
        status: "rejected",
        reviewedByUserId: actor.id,
        reviewedAt: now,
        decisionNoteMd: input.reason,
        updatedAt: now
      })
      .where(eq(accessRequests.id, request.id));

    await insertAuditEvent(tx, {
      actorUserId: actor.id,
      subjectUserId: user?.id ?? null,
      action: "access_request.rejected",
      entityType: "access_request",
      entityId: request.id,
      metadata: {
        reason: input.reason,
        clerkSubject: request.clerkSubject,
        requesterEmail: request.requesterEmail
      }
    });

    return request.clerkSubject;
  });

  return getOwnerAccessRequestDetail(actor, subjectId);
}

export async function updateOwnerUserAccess(
  actor: DbUser,
  userId: string,
  input: UpdateOwnerUserAccessRequest
): Promise<OwnerUserAccessResponse> {
  requireOwner(actor);

  const result = await getDb().transaction(async (tx) => {
    const user = await tx.query.users.findFirst({ where: (row) => eq(row.id, userId) });
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User was not found");
    }

    const nextRole = input.role ?? user.role;
    const nextIsActive = input.isActive ?? user.isActive;

    if (input.role === "owner" && user.role !== "owner") {
      ensureOwnerConfirmation(input.ownerConfirmation, user.email);
    }

    if (user.role === "owner") {
      await tx.execute(
        sql`select ${users.id} from ${users} where ${users.role} = 'owner'::app_role for update`
      );
      const activeOwnerCount = await countActiveOwners(tx);
      assertLastActiveOwnerMutation({
        activeOwnerCount,
        isTargetOwner: true,
        nextIsActive,
        nextRole
      });
    }

    const now = new Date();
    const [updated] = await tx
      .update(users)
      .set({
        role: nextRole,
        isActive: nextIsActive,
        blockedAt: nextIsActive ? null : now,
        blockedByUserId: nextIsActive ? null : actor.id,
        blockReason: nextIsActive ? null : input.reason,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    const request = updated.clerkUserId
      ? await tx.query.accessRequests.findFirst({ where: (row) => eq(row.clerkSubject, updated.clerkUserId ?? "") })
      : await tx.query.accessRequests.findFirst({ where: (row) => eq(row.targetUserId, updated.id) });
    const student =
      nextRole === "student"
        ? await ensureStudentProfile(tx, updated, request ?? null)
        : await tx.query.students.findFirst({ where: (row) => eq(row.userId, updated.id) });

    await insertAuditEvent(tx, {
      actorUserId: actor.id,
      subjectUserId: updated.id,
      action: "user.access_updated",
      entityType: "user",
      entityId: updated.id,
      metadata: {
        reason: input.reason,
        previousRole: user.role,
        nextRole,
        previousIsActive: user.isActive,
        nextIsActive
      }
    });

    return { updated, student };
  });

  return {
    user: mapManagedUser(result.updated, result.student ?? null),
    accessStatus: deriveAccessStatus({
      clerkSubject: result.updated.clerkUserId ?? result.updated.authProviderUserId ?? null,
      request:
        result.updated.clerkUserId
          ? await getDb().query.accessRequests.findFirst({ where: (row) => eq(row.clerkSubject, result.updated.clerkUserId ?? "") })
          : null,
      user: result.updated
    }),
    ownerConfirmationPhrase: getOwnerConfirmationPhrase(result.updated.email)
  };
}

export function deriveAccessStatus({
  clerkSubject,
  request,
  user
}: {
  clerkSubject: string | null;
  request?: DbAccessRequest | null;
  user?: DbUser | null;
}): AccessStatusSummary {
  if (user?.isActive && !user.blockedAt) {
    return {
      state: "active",
      subjectId: clerkSubject,
      requestStatus: request?.status ?? null,
      requestedRole: request?.requestedRole ?? null,
      currentRole: user.role,
      reason: null,
      reviewedAt: request?.reviewedAt?.toISOString() ?? null,
      lastSeenAt: request?.lastSeenAt?.toISOString() ?? null
    };
  }

  if (user && (!user.isActive || user.blockedAt)) {
    return {
      state: "blocked",
      subjectId: clerkSubject,
      requestStatus: request?.status ?? null,
      requestedRole: request?.requestedRole ?? null,
      currentRole: user.role,
      reason: user.blockReason ?? request?.decisionNoteMd ?? null,
      reviewedAt: request?.reviewedAt?.toISOString() ?? null,
      lastSeenAt: request?.lastSeenAt?.toISOString() ?? null
    };
  }

  if (request) {
    return {
      state: request.status,
      subjectId: clerkSubject,
      requestStatus: request.status,
      requestedRole: request.requestedRole ?? null,
      currentRole: null,
      reason: request.decisionNoteMd ?? null,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      lastSeenAt: request.lastSeenAt?.toISOString() ?? null
    };
  }

  return {
    state: "missing",
    subjectId: clerkSubject,
    requestStatus: null,
    requestedRole: null,
    currentRole: null,
    reason: null,
    reviewedAt: null,
    lastSeenAt: null
  };
}

export function getOwnerConfirmationPhrase(email: string) {
  return `MAKE OWNER ${normalizeAccessEmail(email)}`;
}

export function ensureOwnerConfirmation(input: string | undefined, email: string) {
  if ((input ?? "").trim() !== getOwnerConfirmationPhrase(email)) {
    throw new ApiError(409, "CONFLICT", "Owner assignment requires the exact confirmation phrase");
  }
}

export function buildDeterministicPublicCode(base: string, existingCodes: Iterable<string>) {
  const normalizedBase = slugifyPublicCode(base) || "student";
  const existing = new Set(Array.from(existingCodes, (value) => value.toLowerCase()));

  if (!existing.has(normalizedBase)) {
    return normalizedBase;
  }

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${normalizedBase}-${suffix}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  throw new ApiError(409, "CONFLICT", "Could not generate a unique public code");
}

export function assertLastActiveOwnerMutation({
  activeOwnerCount,
  isTargetOwner,
  nextRole,
  nextIsActive
}: {
  activeOwnerCount: number;
  isTargetOwner: boolean;
  nextRole: AppRole;
  nextIsActive: boolean;
}) {
  if (isTargetOwner && (!nextIsActive || nextRole !== "owner") && activeOwnerCount <= 1) {
    throw new ApiError(409, "CONFLICT", "Cannot block or demote the last active owner");
  }
}

async function ensureStudentProfile(db: DbExecutor, user: DbUser, request: DbAccessRequest | null) {
  const existing = await db.query.students.findFirst({ where: (row) => eq(row.userId, user.id) });
  if (existing) {
    return existing;
  }

  const publicCode = await generateUniquePublicCode(db, request?.requesterName ?? user.displayName ?? user.email);
  const [student] = await db
    .insert(students)
    .values({
      userId: user.id,
      tutorUserId: null,
      publicCode,
      displayName: request?.requesterName?.trim() || user.displayName || deriveDisplayNameFromEmail(user.email),
      learningTrack: "ege_informatics",
      status: "active"
    })
    .returning();

  return student;
}

async function generateUniquePublicCode(db: DbExecutor, seed: string) {
  const existing = await db.query.students.findMany({ columns: { publicCode: true } });
  return buildDeterministicPublicCode(seed, existing.map((row) => row.publicCode));
}

async function countActiveOwners(db: DbExecutor) {
  const ownerRows = await db.query.users.findMany({
    where: (row) => and(eq(row.role, "owner"), eq(row.isActive, true))
  });
  return ownerRows.filter((row) => !row.blockedAt).length;
}

async function getAccessHistory(db: DbExecutor, request: DbAccessRequest, user: DbUser | null) {
  const events = await db.query.auditEvents.findMany({
    where: (row) =>
      user
        ? or(and(eq(row.entityType, "access_request"), eq(row.entityId, request.id)), eq(row.subjectUserId, user.id))
        : and(eq(row.entityType, "access_request"), eq(row.entityId, request.id)),
    orderBy: (row) => [desc(row.createdAt)]
  });
  return mapAuditHistory(events, await db.query.users.findMany());
}

async function getUserHistory(db: DbExecutor, user: DbUser, request: DbAccessRequest | null) {
  const events = await db.query.auditEvents.findMany({
    where: (row) =>
      request
        ? or(eq(row.subjectUserId, user.id), and(eq(row.entityType, "access_request"), eq(row.entityId, request.id)))
        : eq(row.subjectUserId, user.id),
    orderBy: (row) => [desc(row.createdAt)]
  });
  return mapAuditHistory(events, await db.query.users.findMany());
}

function mapAuditHistory(events: DbAuditEvent[], userRows: DbUser[]): OwnerHistoryEvent[] {
  const usersById = new Map(userRows.map((row) => [row.id, row]));

  return events.map((event) => ({
    id: event.id,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    createdAt: event.createdAt.toISOString(),
    actorUserId: event.actorUserId ?? null,
    actorEmail: event.actorUserId ? usersById.get(event.actorUserId)?.email ?? null : null,
    metadata: event.metadata ?? {}
  }));
}

function mapAccessRequestRow(request: DbAccessRequest, user: DbUser | null, student: DbStudent | null) {
  return {
    id: request.id,
    subjectId: request.clerkSubject,
    requesterEmail: request.requesterEmail,
    requesterName: request.requesterName ?? null,
    requestedRole: request.requestedRole ?? null,
    status: request.status,
    decisionReason: request.decisionNoteMd ?? null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    lastSeenAt: request.lastSeenAt.toISOString(),
    linkedUserId: user?.id ?? null,
    currentRole: user?.role ?? null,
    blocked: Boolean(user && (!user.isActive || user.blockedAt)),
    studentId: student?.id ?? null,
    studentPublicCode: student?.publicCode ?? null,
    learningTrack: student?.learningTrack ?? null
  };
}

function mapManagedUser(user: DbUser, student: DbStudent | null): OwnerManagedUser {
  return {
    userId: user.id,
    clerkSubject: user.clerkUserId ?? user.authProviderUserId ?? null,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role,
    isActive: user.isActive && !user.blockedAt,
    blockedAt: user.blockedAt?.toISOString() ?? null,
    blockReason: user.blockReason ?? null,
    studentId: student?.id ?? null,
    studentPublicCode: student?.publicCode ?? null,
    learningTrack: student?.learningTrack ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function matchesAccessRequestFilters(
  row: OwnerAccessOverviewResponse["requests"][number],
  filters: OwnerAccessFilters
) {
  if (filters.status && row.status !== filters.status) return false;
  if (filters.role && row.requestedRole !== filters.role && row.currentRole !== filters.role) return false;
  if (filters.active === "active" && row.blocked) return false;
  if (filters.active === "blocked" && !row.blocked) return false;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    return [
      row.requesterEmail,
      row.requesterName ?? "",
      row.studentPublicCode ?? "",
      row.learningTrack ?? ""
    ].some((value) => value.toLowerCase().includes(q));
  }
  return true;
}

function matchesManagedUserFilters(row: OwnerManagedUser, filters: OwnerAccessFilters) {
  if (filters.role && row.role !== filters.role) return false;
  if (filters.active === "active" && !row.isActive) return false;
  if (filters.active === "blocked" && row.isActive) return false;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    return [row.email, row.displayName ?? "", row.studentPublicCode ?? "", row.learningTrack ?? ""].some((value) =>
      value.toLowerCase().includes(q)
    );
  }
  return true;
}

function findUserForRequest(userRows: DbUser[], request: DbAccessRequest) {
  return (
    userRows.find(
      (row) =>
        row.clerkUserId === request.clerkSubject ||
        row.authProviderUserId === request.clerkSubject ||
        row.email === request.requesterEmail
    ) ?? null
  );
}

function deriveDisplayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "student";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugifyPublicCode(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function requireOwner(user: DbUser) {
  if (user.role !== "owner") {
    throw new ApiError(403, "FORBIDDEN", "Owner access is required");
  }
}

async function insertAuditEvent(
  db: DbExecutor,
  input: {
    actorUserId: string | null;
    subjectUserId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
  }
) {
  await db.insert(auditEvents).values({
    actorUserId: input.actorUserId,
    subjectUserId: input.subjectUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata
  });
}
