"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@eduferma/ui";
import { LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function ClerkSignOutAction({
  children = "Выйти",
  className,
  redirectUrl = "/",
  variant = "secondary"
}: {
  children?: ReactNode;
  className?: string;
  redirectUrl?: string;
  variant?: ButtonVariant;
}) {
  const { isLoaded, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (!isLoaded || !signOut || isSigningOut) return;

    setIsSigningOut(true);
    try {
      await signOut({ redirectUrl });
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <Button
      aria-label="Выйти из аккаунта"
      className={className}
      disabled={!isLoaded || isSigningOut}
      onClick={handleSignOut}
      type="button"
      variant={variant}
    >
      <LogOut aria-hidden="true" />
      {isSigningOut ? "Выходим..." : children}
    </Button>
  );
}
