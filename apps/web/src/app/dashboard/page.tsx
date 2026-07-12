import {
  BookOpenCheck,
  ClipboardList,
  DatabaseZap,
  LayoutDashboard,
  LogIn,
  Stethoscope,
  UsersRound
} from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, LinkButton } from "@eduferma/ui";
import { roleNames, routes, type AppRole } from "@eduferma/config";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

export const dynamic = "force-dynamic";

const dashboardPathByRole: Partial<Record<AppRole, string>> = {
  owner: routes.teacherDashboard,
  tutor: routes.teacherDashboard,
  student: routes.studentDashboard,
  guardian: routes.studentDashboard
};

const dashboardLinks = [
  {
    title: "Войти",
    description: "Авторизация через invitation flow.",
    href: routes.signIn,
    icon: LogIn
  },
  {
    title: "Кабинет учителя",
    description: "Обзор учеников, ДЗ, банка задач и mastery.",
    href: routes.teacherDashboard,
    icon: LayoutDashboard
  },
  {
    title: "Кабинет ученика",
    description: "Домашки, дедлайны и прогресс ученика.",
    href: routes.studentDashboard,
    icon: BookOpenCheck
  },
  {
    title: "Банк задач",
    description: "Teacher dashboard section и read-only task-bank API.",
    href: routes.taskBank,
    icon: DatabaseZap
  },
  {
    title: "Ученики",
    description: "Список учеников, треки и ближайшие шаги.",
    href: routes.teacherStudents,
    icon: UsersRound
  },
  {
    title: "Домашки",
    description: "Быстрые входы в ученические и преподавательские ДЗ.",
    href: routes.studentAssignments,
    icon: ClipboardList
  }
] as const;

async function getDashboardAccessSafely() {
  try {
    return await getCurrentPlatformAccess();
  } catch {
    return null;
  }
}

export default async function DashboardIndex() {
  const access = await getDashboardAccessSafely();
  const dashboardPath = access ? dashboardPathByRole[access.role] : null;

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return (
    <main className="dashboard-index-page">
      <section className="dashboard-index-hero">
        <div>
          <Badge>{access ? `роль: ${roleNames[access.role]}` : "роль не определена"}</Badge>
          <h1>EduFerma dashboard</h1>
          <p>
            Роль не удалось надёжно определить на index-странице. Можно перейти в нужный раздел напрямую:
            защищённые страницы всё равно выполнят server-side access check.
          </p>
        </div>
        <div className="dashboard-index-actions">
          <LinkButton href={routes.diagnostics} variant="secondary">
            <Stethoscope aria-hidden="true" />
            Диагностика
          </LinkButton>
          <LinkButton href={routes.apiDocs} variant="ghost">
            API docs
          </LinkButton>
        </div>
      </section>

      <nav className="dashboard-index-grid" aria-label="Разделы dashboard">
        {dashboardLinks.map((item) => {
          const Icon = item.icon;

          return (
            <a className="dashboard-index-card" href={item.href} key={item.title}>
              <span className="quick-action-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="quick-action-meta">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
            </a>
          );
        })}
      </nav>
    </main>
  );
}
