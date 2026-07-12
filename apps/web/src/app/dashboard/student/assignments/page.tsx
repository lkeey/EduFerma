import { BarChart3, BookOpenCheck, CalendarDays, Home, LineChart, LockKeyhole, MessageCircle } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { getStudentDashboardData } from "@/lib/platform/dashboard";
import { requirePlatformPath } from "@/lib/platform/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
  const access = await requirePlatformPath("/dashboard/student/assignments");
  if (!access.ok) {
    redirect(access.redirectTo);
  }

  const config = getPublicConfig();
  const dashboard = await getStudentDashboardData();

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="brand-mark" href="/">
          <span>EF</span>
          <span>EduFerma</span>
        </a>
        <nav aria-label="Student navigation">
          <a href="/dashboard/student">
            <Home aria-hidden="true" /> Обзор
          </a>
          <a aria-current="page" href="/dashboard/student/assignments">
            <BookOpenCheck aria-hidden="true" /> ДЗ
          </a>
          <a href="/dashboard/student#progress">
            <LineChart aria-hidden="true" /> Прогресс
          </a>
          <a href="/diagnostics">
            <BarChart3 aria-hidden="true" /> Диагностика
          </a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <Badge>assignments · {dashboard.source.kind}</Badge>
            <h1>Мои домашние задания</h1>
            <p>Статусы, дедлайны и результаты. Ответы остаются скрытыми до сдачи или разрешения преподавателя.</p>
            {dashboard.source.reason ? <p>{dashboard.source.reason}</p> : null}
          </div>
          <div className="topbar-actions">
            <LinkButton href="/dashboard/student" variant="secondary">
              <Home aria-hidden="true" />
              Обзор
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              <MessageCircle aria-hidden="true" />
              Написать
            </LinkButton>
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="Активные ДЗ" value={dashboard.metrics.activeAssignments} detail="назначенные и последние" />
          <MetricCard label="Ближайшее занятие" value={dashboard.metrics.nextLesson} detail="для планирования" />
          <MetricCard label="Ответы" value={dashboard.metrics.answers} detail="policy check" />
        </div>

        <div className="dashboard-grid">
          <Panel>
            <div className="panel-header">
              <h2>Домашние задания</h2>
              <Badge>{dashboard.source.kind}</Badge>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Дедлайн</th>
                  <th>Результат</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.assignments.length ? (
                  dashboard.assignments.map((row) => (
                    <tr key={`${row.title}:${row.due}`}>
                      <td>{row.title}</td>
                      <td>{row.status}</td>
                      <td>{row.due}</td>
                      <td>{row.score}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>Домашки пока нет. Если это ошибка, сообщите преподавателю и приложите diagnostics.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <div className="stack">
            <Panel>
              <div className="panel-header">
                <h2>Доступ</h2>
                <LockKeyhole aria-hidden="true" />
              </div>
              <p>Эта страница доступна ученику, родителю и преподавателю. Teacher-only ответы и решения здесь не показываются.</p>
            </Panel>

            <Panel>
              <div className="panel-header">
                <h2>Дедлайны</h2>
                <CalendarDays aria-hidden="true" />
              </div>
              <p>Если дедлайн или статус выглядят неверно, принесите страницу в diagnostics вместе с названием ДЗ.</p>
              <LinkButton href="/diagnostics" variant="secondary">
                Перейти в diagnostics
              </LinkButton>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}
