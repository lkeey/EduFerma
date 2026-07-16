import { pathToFileURL } from "node:url";
import { eq, or } from "drizzle-orm";
import {
  accessRequests,
  getDb,
  loadWorkspaceEnv,
  students,
  teacherStudentLinks,
  users
} from "@eduferma/db";
import {
  getClerkE2EIdentities,
  type ClerkE2EIdentity,
  type ClerkE2ERole
} from "./lib/clerk-e2e-identities";

const clerkApiUrl = "https://api.clerk.com";
const applyConfirmation = "PROVISION PRODUCTION CLERK E2E";

type ClerkUser = {
  id: string;
  email_addresses?: Array<{ email_address?: string }>;
};

type ProvisionResult = {
  role: ClerkE2ERole;
  clerkUserExists: boolean;
  clerkUserCreated: boolean;
  dbUserExists: boolean;
  dbUserUpserted: boolean;
  studentProfileUpserted: boolean;
  teacherStudentLinkUpserted: boolean;
};

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbUser = typeof users.$inferSelect;

async function main() {
  loadWorkspaceEnv();
  const apply = process.argv.includes("--apply");
  const confirmation = readFlagValue(process.argv.slice(2), "--confirm");

  if (apply && confirmation !== applyConfirmation) {
    throw new Error(
      `Applying requires --confirm="${applyConfirmation}".`
    );
  }

  const secretKey = requireEnv("CLERK_SECRET_KEY");
  const identities = getClerkE2EIdentities();
  const existingClerkUsers = await Promise.all(
    identities.map((identity) =>
      findClerkUserByEmail(secretKey, identity.email)
    )
  );
  const db = getDb();
  const existingDbUsers = await Promise.all(
    identities.map((identity, index) =>
      findDbUser(db, identity.email, existingClerkUsers[index]?.id)
    )
  );

  if (!apply) {
    const preview: ProvisionResult[] = identities.map((identity, index) => ({
      role: identity.role,
      clerkUserExists: Boolean(existingClerkUsers[index]),
      clerkUserCreated: false,
      dbUserExists: Boolean(existingDbUsers[index]),
      dbUserUpserted: false,
      studentProfileUpserted: false,
      teacherStudentLinkUpserted: false
    }));
    printSafeResult("dry-run", preview);
    return;
  }

  const clerkUsers = await Promise.all(
    identities.map(async (identity, index) => ({
      identity,
      user:
        existingClerkUsers[index] ??
        (await createClerkUser(secretKey, identity)),
      created: !existingClerkUsers[index]
    }))
  );

  const dbResults = await db.transaction(async (tx) => {
    const upserted = new Map<
      ClerkE2ERole,
      { user: DbUser; existed: boolean; studentProfileUpserted: boolean }
    >();

    for (const entry of clerkUsers) {
      const result = await upsertDbIdentity(
        tx,
        entry.identity,
        entry.user,
        existingDbUsers.find(
          (existing) =>
            existing?.email.toLowerCase() === entry.identity.email.toLowerCase()
        )
      );
      upserted.set(entry.identity.role, result);
    }

    const owner = upserted.get("owner")!.user;
    for (const entry of clerkUsers) {
      const target = upserted.get(entry.identity.role)!.user;
      await tx
        .insert(accessRequests)
        .values({
          clerkSubject: entry.user.id,
          requestedByUserId: owner.id,
          targetUserId: target.id,
          requestKind: "access",
          requestedRole: entry.identity.role,
          requesterEmail: entry.identity.email,
          requesterName: entry.identity.displayName,
          status: "approved",
          reviewedByUserId: owner.id,
          reviewedAt: new Date(),
          decisionNoteMd: "Dedicated isolated production E2E identity.",
          lastSeenAt: new Date(),
          metadata: {
            edufermaE2E: true,
            isolated: true,
            provisioner: "scripts/provision-clerk-e2e-users.ts"
          }
        })
        .onConflictDoUpdate({
          target: accessRequests.clerkSubject,
          set: {
            targetUserId: target.id,
            requestedRole: entry.identity.role,
            requesterEmail: entry.identity.email,
            requesterName: entry.identity.displayName,
            status: "approved",
            reviewedByUserId: owner.id,
            reviewedAt: new Date(),
            decisionNoteMd: "Dedicated isolated production E2E identity.",
            lastSeenAt: new Date(),
            metadata: {
              edufermaE2E: true,
              isolated: true,
              provisioner: "scripts/provision-clerk-e2e-users.ts"
            },
            updatedAt: new Date()
          }
        });
    }

    const teacher = upserted.get("teacher")!.user;
    const studentUser = upserted.get("student")!.user;
    const student = await tx.query.students.findFirst({
      where: (row) => eq(row.userId, studentUser.id)
    });
    if (!student) {
      throw new Error("The isolated E2E student profile was not created.");
    }

    await tx
      .insert(teacherStudentLinks)
      .values({ teacherUserId: teacher.id, studentId: student.id })
      .onConflictDoNothing();

    return {
      upserted,
      teacherStudentLinkUpserted: true
    };
  });

  const results: ProvisionResult[] = clerkUsers.map((entry) => {
    const dbResult = dbResults.upserted.get(entry.identity.role)!;
    return {
      role: entry.identity.role,
      clerkUserExists: true,
      clerkUserCreated: entry.created,
      dbUserExists: dbResult.existed,
      dbUserUpserted: true,
      studentProfileUpserted: dbResult.studentProfileUpserted,
      teacherStudentLinkUpserted:
        entry.identity.role === "teacher"
          ? dbResults.teacherStudentLinkUpserted
          : false
    };
  });

  printSafeResult("apply", results);
}

async function findClerkUserByEmail(
  secretKey: string,
  email: string
): Promise<ClerkUser | null> {
  const url = new URL("/v1/users", clerkApiUrl);
  url.searchParams.set("email_address", email);
  const response = await clerkRequest(secretKey, url, { method: "GET" });
  const payload = (await response.json()) as
    | ClerkUser[]
    | { data?: ClerkUser[] };
  const entries = Array.isArray(payload) ? payload : payload.data ?? [];

  return (
    entries.find((user) =>
      user.email_addresses?.some(
        (address) => address.email_address?.toLowerCase() === email.toLowerCase()
      )
    ) ?? null
  );
}

async function createClerkUser(
  secretKey: string,
  identity: ClerkE2EIdentity
): Promise<ClerkUser> {
  const [firstName, ...lastNameParts] = identity.displayName.split(" ");
  const response = await clerkRequest(
    secretKey,
    new URL("/v1/users", clerkApiUrl),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email_address: [identity.email],
        first_name: firstName,
        last_name: lastNameParts.join(" "),
        public_metadata: {
          edufermaE2E: true,
          edufermaRole: identity.role,
          isolated: true
        }
      })
    }
  );

  return (await response.json()) as ClerkUser;
}

async function clerkRequest(
  secretKey: string,
  url: URL,
  init: RequestInit
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${secretKey}`,
      ...init.headers
    },
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`Clerk API request failed with HTTP ${response.status}.`);
  }

  return response;
}

async function findDbUser(
  db: Db,
  email: string,
  clerkUserId?: string
): Promise<DbUser | undefined> {
  return db.query.users.findFirst({
    where: (row) =>
      clerkUserId
        ? or(
            eq(row.email, email),
            eq(row.clerkUserId, clerkUserId),
            eq(row.authProviderUserId, clerkUserId)
          )
        : eq(row.email, email)
  });
}

async function upsertDbIdentity(
  tx: Tx,
  identity: ClerkE2EIdentity,
  clerkUser: ClerkUser,
  knownExisting?: DbUser
) {
  const existing =
    knownExisting ??
    (await tx.query.users.findFirst({
      where: (row) =>
        or(
          eq(row.email, identity.email),
          eq(row.clerkUserId, clerkUser.id),
          eq(row.authProviderUserId, clerkUser.id)
        )
    }));

  const [user] = existing
    ? await tx
        .update(users)
        .set({
          clerkUserId: clerkUser.id,
          authProviderUserId: clerkUser.id,
          email: identity.email,
          displayName: identity.displayName,
          role: identity.role,
          isActive: true,
          blockedAt: null,
          blockedByUserId: null,
          blockReason: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, existing.id))
        .returning()
    : await tx
        .insert(users)
        .values({
          clerkUserId: clerkUser.id,
          authProviderUserId: clerkUser.id,
          email: identity.email,
          displayName: identity.displayName,
          role: identity.role,
          isActive: true
        })
        .returning();

  let studentProfileUpserted = false;
  if (identity.role === "student") {
    const existingStudent = await tx.query.students.findFirst({
      where: (row) => eq(row.userId, user.id)
    });
    const publicCode =
      existingStudent?.publicCode ??
      `e2e-${clerkUser.id.replace(/[^a-z0-9]/gi, "").slice(-16).toLowerCase()}`;

    if (existingStudent) {
      await tx
        .update(students)
        .set({
          displayName: identity.displayName,
          learningTrack: "ege_informatics",
          status: "active",
          metadata: {
            ...(existingStudent.metadata ?? {}),
            edufermaE2E: true,
            isolated: true
          },
          updatedAt: new Date()
        })
        .where(eq(students.id, existingStudent.id));
    } else {
      await tx.insert(students).values({
        userId: user.id,
        publicCode,
        displayName: identity.displayName,
        learningTrack: "ege_informatics",
        status: "active",
        metadata: {
          edufermaE2E: true,
          isolated: true
        }
      });
    }
    studentProfileUpserted = true;
  }

  return {
    user,
    existed: Boolean(existing),
    studentProfileUpserted
  };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function readFlagValue(argv: string[], name: string) {
  const equalsArg = argv.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function printSafeResult(mode: "dry-run" | "apply", results: ProvisionResult[]) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        identities: results
      },
      null,
      2
    )
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Clerk E2E provisioning failed."
    );
    process.exitCode = 1;
  });
}
