import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
