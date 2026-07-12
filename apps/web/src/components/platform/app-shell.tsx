import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenCheck, CalendarDays, ClipboardCheck, DatabaseZap, Home, LineChart, UsersRound } from "lucide-react";
import { AccountSignOutAction } from "@/components/auth/account-sign-out-action";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const studentNav: NavItem[] = [
  { href: "/student/dashboard", label: "Обзор", icon: <Home aria-hidden="true" /> },
  { href: "/student/schedule", label: "Расписание", icon: <CalendarDays aria-hidden="true" /> },
  { href: "/student/plan", label: "План", icon: <BookOpenCheck aria-hidden="true" /> },
  { href: "/student/assignments", label: "ДЗ", icon: <ClipboardCheck aria-hidden="true" /> },
  { href: "/student/progress", label: "Прогресс", icon: <LineChart aria-hidden="true" /> }
];

const teacherNav: NavItem[] = [
  { href: "/teacher/dashboard", label: "Обзор", icon: <Home aria-hidden="true" /> },
  { href: "/teacher/students", label: "Ученики", icon: <UsersRound aria-hidden="true" /> },
  { href: "/teacher/task-bank", label: "Банк задач", icon: <DatabaseZap aria-hidden="true" /> },
  { href: "/teacher/assignments", label: "ДЗ", icon: <ClipboardCheck aria-hidden="true" /> },
  { href: "/teacher/reviews", label: "Проверка", icon: <LineChart aria-hidden="true" /> }
];

export function PlatformShell({
  role,
  title,
  subtitle,
  actions,
  children
}: {
  role: "student" | "teacher";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const nav = role === "student" ? studentNav : teacherNav;

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="brand-mark" href="/">
          <span>EF</span>
          <span>EduFerma</span>
        </Link>
        <nav aria-label={role === "student" ? "Student navigation" : "Teacher navigation"}>
          {nav.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
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
