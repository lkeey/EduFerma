import { resolveRoleFromEmail } from "@eduferma/core";

export function resolveBootstrapRole(email?: string | null) {
  return resolveRoleFromEmail(email, {
    ownerEmail: process.env.OWNER_EMAIL,
    tutorEmails: process.env.TUTOR_EMAILS,
    teacherEmails: process.env.TEACHER_EMAILS,
    studentEmails: process.env.STUDENT_EMAILS,
    guardianEmails: process.env.GUARDIAN_EMAILS
  });
}

export function hasClerkEnv() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
