import { LinkButton } from "@eduferma/ui";
import { LogOut } from "lucide-react";
import { ClerkSignOutAction } from "@/components/auth/sign-out-action";
import { resolveClerkEnv } from "@/lib/clerk-env";
import { isDemoAuthRuntimeEnabled } from "@/lib/demo-auth";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function AccountSignOutAction({
  className,
  label = "Выйти",
  redirectUrl = "/",
  variant = "secondary"
}: {
  className?: string;
  label?: string;
  redirectUrl?: string;
  variant?: ButtonVariant;
}) {
  if (!isDemoAuthRuntimeEnabled() && resolveClerkEnv().publishableKey) {
    return (
      <ClerkSignOutAction className={className} redirectUrl={redirectUrl} variant={variant}>
        {label}
      </ClerkSignOutAction>
    );
  }

  return (
    <LinkButton className={className} href="/api/demo-auth/logout" variant={variant}>
      <LogOut aria-hidden="true" />
      {label || "Выйти"}
    </LinkButton>
  );
}
