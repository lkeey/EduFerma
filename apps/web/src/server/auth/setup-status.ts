import { hasRuntimeDatabaseEnv } from "@eduferma/db";
import { resolveClerkEnv } from "@/lib/clerk-env";

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
  const clerkEnv = resolveClerkEnv(env);

  return {
    clerk: {
      configured: clerkEnv.configured,
      publishableKeyConfigured: Boolean(clerkEnv.publishableKey),
      secretKeyConfigured: Boolean(clerkEnv.secretKey),
      missingEnv: clerkEnv.missingEnv
    },
    database: {
      configured: hasRuntimeDatabaseEnv(env)
    },
    ownerEmailConfigured: Boolean(env.OWNER_EMAIL)
  };
}
