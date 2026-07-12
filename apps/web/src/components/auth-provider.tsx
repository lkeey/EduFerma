import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { resolveClerkEnv } from "@/lib/clerk-env";

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkEnv = resolveClerkEnv();

  if (!clerkEnv.publishableKey) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={clerkEnv.publishableKey}>{children}</ClerkProvider>;
}
