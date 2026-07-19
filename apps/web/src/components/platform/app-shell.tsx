import Link from "next/link";
import type { ReactNode } from "react";
import { AccountSignOutAction } from "@/components/auth/account-sign-out-action";
import { PlatformNavigation } from "@/components/platform/platform-navigation";
import { getCurrentServiceUser } from "@/server/auth/session";

export async function PlatformShell({
  role,
  title,
  subtitle,
  actions,
  children
}: {
  role: "student" | "teacher" | "owner";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const currentUser = role === "teacher" ? await getCurrentServiceUser() : null;
  const effectiveRole = role === "teacher" && currentUser?.role === "owner" ? "owner" : role;

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-top">
          <Link className="brand-mark" href="/">
            <span>EF</span>
            <span>EduFerma</span>
          </Link>
          <PlatformNavigation role={effectiveRole} />
        </div>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="dashboard-header-actions">
            {actions}
            <AccountSignOutAction />
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
