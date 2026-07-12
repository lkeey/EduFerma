import { resolveRoleFromEmail } from "@eduferma/core";
import { getAuthSetupStatus } from "@/server/auth/setup-status";

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
  return getAuthSetupStatus().clerk.configured;
}
