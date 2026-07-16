export const clerkE2ERoles = ["owner", "teacher", "student"] as const;

export type ClerkE2ERole = (typeof clerkE2ERoles)[number];

export type ClerkE2EIdentity = {
  role: ClerkE2ERole;
  email: string;
  displayName: string;
  homePath: string;
  heading: string;
  storageStatePath: string;
};

export type ClerkE2EUserCreatePayload = {
  email_address: string[];
  first_name: string;
  last_name: string;
  skip_password_requirement: true;
  public_metadata: {
    edufermaE2E: true;
    edufermaRole: ClerkE2ERole;
    isolated: true;
  };
};

type IdentityEnv = Record<string, string | undefined>;

const identityConfig: Record<
  ClerkE2ERole,
  Omit<ClerkE2EIdentity, "role" | "email">
> = {
  owner: {
    displayName: "EduFerma E2E Owner",
    homePath: "/owner/access",
    heading: "Owner Access",
    storageStatePath: "playwright/.clerk/owner.json"
  },
  teacher: {
    displayName: "EduFerma E2E Teacher",
    homePath: "/teacher/dashboard",
    heading: "Кабинет преподавателя",
    storageStatePath: "playwright/.clerk/teacher.json"
  },
  student: {
    displayName: "EduFerma E2E Student",
    homePath: "/student/dashboard",
    heading: "Кабинет ученика",
    storageStatePath: "playwright/.clerk/student.json"
  }
};

export function deriveClerkE2EEmail(
  baseEmail: string,
  role: ClerkE2ERole
): string {
  const normalized = baseEmail.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    throw new Error(
      "E2E_CLERK_BASE_EMAIL or OWNER_EMAIL must be a valid email address."
    );
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const stableLocalPart = localPart.split("+", 1)[0]?.trim();
  if (!stableLocalPart) {
    throw new Error("The base email local part must not be empty.");
  }

  return `${stableLocalPart}+eduferma_e2e_${role}@${domain}`;
}

export function getClerkE2EIdentities(
  env: IdentityEnv = process.env
): ClerkE2EIdentity[] {
  const baseEmail = env.E2E_CLERK_BASE_EMAIL?.trim() || env.OWNER_EMAIL?.trim();
  if (!baseEmail) {
    throw new Error(
      "E2E_CLERK_BASE_EMAIL or OWNER_EMAIL is required for Clerk E2E identities."
    );
  }

  return clerkE2ERoles.map((role) => ({
    role,
    email: deriveClerkE2EEmail(baseEmail, role),
    ...identityConfig[role]
  }));
}

export function getClerkE2EIdentity(
  role: ClerkE2ERole,
  env: IdentityEnv = process.env
): ClerkE2EIdentity {
  return getClerkE2EIdentities(env).find(
    (identity) => identity.role === role
  )!;
}

export function getClerkE2EUserCreatePayload(
  identity: ClerkE2EIdentity
): ClerkE2EUserCreatePayload {
  const [firstName, ...lastNameParts] = identity.displayName.split(" ");

  return {
    email_address: [identity.email],
    first_name: firstName,
    last_name: lastNameParts.join(" "),
    skip_password_requirement: true,
    public_metadata: {
      edufermaE2E: true,
      edufermaRole: identity.role,
      isolated: true
    }
  };
}
