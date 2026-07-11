import { hasRuntimeDatabaseEnv } from "@eduferma/db";

export type AuthSetupStatus = {
  clerk: {
    configured: boolean;
    publishableKeyConfigured: boolean;
    secretKeyConfigured: boolean;
    missingEnv: string[];
  };
  database: {
    configured: boolean;
  };
  ownerEmailConfigured: boolean;
};

export function getAuthSetupStatus(env: NodeJS.ProcessEnv = process.env): AuthSetupStatus {
  const publishableKeyConfigured = Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const secretKeyConfigured = Boolean(env.CLERK_SECRET_KEY);
  const missingEnv = [
    !publishableKeyConfigured ? "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" : undefined,
    !secretKeyConfigured ? "CLERK_SECRET_KEY" : undefined
  ].filter((value): value is string => Boolean(value));

  return {
    clerk: {
      configured: publishableKeyConfigured && secretKeyConfigured,
      publishableKeyConfigured,
      secretKeyConfigured,
      missingEnv
    },
    database: {
      configured: hasRuntimeDatabaseEnv(env)
    },
    ownerEmailConfigured: Boolean(env.OWNER_EMAIL)
  };
}
