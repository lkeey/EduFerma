import { pathToFileURL } from "node:url";
import { and, eq } from "drizzle-orm";
import { normalizeAccessEmail } from "@eduferma/core";
import { appRole, getDb, invitations, loadWorkspaceEnv, students, teacherStudentLinks, users } from "@eduferma/db";

type AppRole = (typeof appRole.enumValues)[number];

type Args = {
  email: string;
  role: AppRole;
  clerkUserId?: string;
  displayName?: string;
  publicCode?: string;
  learningTrack?: string;
  tutorEmail?: string;
  invite: boolean;
  apply: boolean;
};

async function main() {
  loadWorkspaceEnv();
  const args = parseArgs(process.argv.slice(2));
  const email = normalizeAccessEmail(args.email);
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: (row) => eq(row.email, email) });

  const preview = {
    mode: args.apply ? "apply" : "dry-run",
    email,
    role: args.role,
    hasClerkUserId: Boolean(args.clerkUserId),
    createsInvitation: args.invite,
    createsStudentProfile: args.role === "student",
    existingUser: Boolean(existing)
  };

  if (!args.apply) {
    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  const [user] = existing
    ? await db
        .update(users)
        .set({
          role: args.role,
          displayName: args.displayName ?? existing.displayName,
          clerkUserId: args.clerkUserId ?? existing.clerkUserId,
          authProviderUserId: args.clerkUserId ?? existing.authProviderUserId,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, existing.id))
        .returning()
    : await db
        .insert(users)
        .values({
          email,
          role: args.role,
          displayName: args.displayName,
          clerkUserId: args.clerkUserId,
          authProviderUserId: args.clerkUserId,
          isActive: true
        })
        .returning();

  if (args.invite) {
    const pendingInvitation = await db.query.invitations.findFirst({
      where: (row) => and(eq(row.email, email), eq(row.role, args.role), eq(row.status, "pending"))
    });
    if (!pendingInvitation) {
      await db.insert(invitations).values({ email, role: args.role, status: "pending" });
    }
  }

  let studentId: string | undefined;
  if (args.role === "student") {
    const existingStudent = await db.query.students.findFirst({ where: (row) => eq(row.userId, user.id) });
    const defaultPublicCode = email.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const publicCode = args.publicCode ?? existingStudent?.publicCode ?? defaultPublicCode;
    const learningTrack = args.learningTrack ?? existingStudent?.learningTrack ?? "ege_informatics";
    const [student] = existingStudent
      ? await db
          .update(students)
          .set({
            displayName: args.displayName ?? existingStudent.displayName,
            publicCode,
            learningTrack,
            updatedAt: new Date()
          })
          .where(eq(students.id, existingStudent.id))
          .returning()
      : await db
          .insert(students)
          .values({
            userId: user.id,
            publicCode,
            displayName: args.displayName ?? email,
            learningTrack
          })
          .returning();

    studentId = student.id;
    if (args.tutorEmail) {
      const tutor = await db.query.users.findFirst({ where: (row) => eq(row.email, normalizeAccessEmail(args.tutorEmail!)) });
      if (!tutor) throw new Error("Tutor user was not found; create the teacher/tutor account first");
      await db
        .insert(teacherStudentLinks)
        .values({ teacherUserId: tutor.id, studentId: student.id })
        .onConflictDoNothing();
    }
  }

  console.log(JSON.stringify({
    ok: true,
    userId: user.id,
    email: user.email,
    role: user.role,
    hasClerkUserId: Boolean(user.clerkUserId || user.authProviderUserId),
    studentId
  }, null, 2));
}

function parseArgs(argv: string[]): Args {
  const get = (name: string) => argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const email = get("email");
  const role = get("role") as AppRole | undefined;
  if (!email) throw new Error("--email is required");
  if (!role || !["owner", "teacher", "tutor", "student", "guardian"].includes(role)) {
    throw new Error("--role must be owner, teacher, tutor, student, or guardian");
  }

  return {
    email,
    role,
    clerkUserId: get("clerk-user-id"),
    displayName: get("display-name"),
    publicCode: get("public-code"),
    learningTrack: get("learning-track"),
    tutorEmail: get("tutor-email"),
    invite: argv.includes("--invite"),
    apply: argv.includes("--apply")
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
