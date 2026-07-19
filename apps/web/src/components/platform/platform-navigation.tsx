"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  DatabaseZap,
  Home,
  LineChart,
  Menu,
  ShieldCheck,
  UsersRound,
  X
} from "lucide-react";

type PlatformRole = "student" | "teacher" | "owner";

const studentNav = [
  { href: "/student/dashboard", label: "Обзор", icon: Home },
  { href: "/student/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/student/plan", label: "План", icon: BookOpenCheck },
  { href: "/student/assignments", label: "ДЗ", icon: ClipboardCheck },
  { href: "/student/progress", label: "Прогресс", icon: LineChart }
] as const;

const teacherNav = [
  { href: "/teacher/dashboard", label: "Обзор", icon: Home },
  { href: "/teacher/students", label: "Ученики", icon: UsersRound },
  { href: "/teacher/imports", label: "Импорт", icon: BookOpenCheck },
  { href: "/teacher/task-bank", label: "Банк задач", icon: DatabaseZap },
  { href: "/teacher/assignments", label: "ДЗ", icon: ClipboardCheck },
  { href: "/teacher/reviews", label: "Проверка", icon: LineChart }
] as const;

const ownerNav = [
  ...teacherNav,
  { href: "/owner/access", label: "Доступ", icon: ShieldCheck }
] as const;

function isActiveRoute(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href.endsWith("/dashboard")) return false;
  return pathname.startsWith(`${href}/`);
}

export function PlatformNavigation({ role }: { role: PlatformRole }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAccessCount, setPendingAccessCount] = useState<number | null>(null);
  const navigationId = useId();
  const nav = role === "student" ? studentNav : role === "owner" ? ownerNav : teacherNav;
  const label = role === "student" ? "Навигация ученика" : role === "owner" ? "Навигация owner" : "Навигация преподавателя";

  useEffect(() => {
    if (role !== "owner") return;

    const controller = new AbortController();
    fetch("/api/v1/owner/access?status=pending", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { requests?: unknown[]; total?: number };
      })
      .then((payload) => {
        if (!payload) return;
        const count = typeof payload.total === "number"
          ? payload.total
          : Array.isArray(payload.requests)
            ? payload.requests.length
            : null;
        setPendingAccessCount(count);
      })
      .catch(() => {
        // The owner navigation remains usable when the optional count is unavailable.
      });

    return () => controller.abort();
  }, [role]);

  return (
    <>
      <button
        aria-controls={navigationId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        className="dashboard-nav-toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        <span>Меню</span>
      </button>
      <nav aria-label={label} className="dashboard-navigation" data-open={isOpen} id={navigationId}>
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(pathname, item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              href={item.href}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              <Icon aria-hidden="true" />
              {item.label}
              {item.href === "/owner/access" && pendingAccessCount !== null ? (
                <span aria-label={`Ожидают доступа: ${pendingAccessCount}`} className="dashboard-nav-count">
                  {pendingAccessCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
