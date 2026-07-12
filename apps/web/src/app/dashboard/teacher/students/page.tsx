import { BarChart3, BookOpenCheck, DatabaseZap, Home, MessageCircle, UsersRound } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { getTeacherDashboardData } from "@/lib/platform/dashboard";
import { requirePlatformPath } from "@/lib/platform/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const access = await requirePlatformPath("/dashboard/teacher/students");
  if (!access.ok) {
    redirect(access.redirectTo);
  }

  const config = getPublicConfig();
  const dashboard = await getTeacherDashboardData();

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="brand-mark" href="/">
          <span>EF</span>
          <span>EduFerma</span>
        </a>
        <nav aria-label="Teacher navigation">
          <a href="/dashboard/teacher">
            <Home aria-hidden="true" /> Обзор
          </a>
          <a aria-current="page" href="/dashboard/teacher/students">
            <UsersRound aria-hidden="true" /> Ученики
          </a>
          <a href="/dashboard/teacher/assignments">
            <BookOpenCheck aria-hidden="true" /> Домашки
          </a>
          <a href="/task-bank">
            <DatabaseZap aria-hidden="true" /> Банк задач
          </a>
          <a href="/diagnostics">
            <BarChart3 aria-hidden="true" /> Диагностика
          </a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <Badge>teacher · {dashboard.source.kind}</Badge>
            <h1>Ученики</h1>
            <p>Список учеников, учебных треков и ближайших тем из текущего teacher dashboard service.</p>
            {dashboard.source.reason ? <p>{dashboard.source.reason}</p> : null}
          </div>
          <div className="topbar-actions">
            <LinkButton href="/dashboard/teacher/assignments" variant="secondary">
              <BookOpenCheck aria-hidden="true" />
              Домашки
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              <MessageCircle aria-hidden="true" />
              Telegram
            </LinkButton>
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="Ученики" value={dashboard.metrics.students} detail="owner/tutor only" />
          <MetricCard label="ДЗ к проверке" value={dashboard.metrics.assignmentsToReview} detail="submitted" />
          <MetricCard label="Task bank" value={dashboard.metrics.taskBank} detail="для подбора заданий" />
        </div>

        <div className="dashboard-grid">
          <Panel>
            <div className="panel-header">
              <h2>Ученики и ближайшие шаги</h2>
              <Badge>{dashboard.source.kind}</Badge>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Трек</th>
                  <th>Следующая тема</th>
                  <th>Риск</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.students.length ? (
                  dashboard.students.map((row) => (
                    <tr key={row.student}>
                      <td>{row.student}</td>
                      <td>{row.track}</td>
                      <td>{row.next}</td>
                      <td>{row.risk}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>Ученики пока не подключены. Проверьте БД, seed/demo или импорт student space.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <div className="stack">
            <Panel>
              <div className="panel-header">
                <h2>Связанные разделы</h2>
                <UsersRound aria-hidden="true" />
              </div>
              <p>Домашки вынесены в отдельную страницу, а подбор задач открыт через банк задач.</p>
              <div className="topbar-actions">
                <LinkButton href="/dashboard/teacher/assignments" variant="secondary">
                  Домашки
                </LinkButton>
                <LinkButton href="/task-bank" variant="secondary">
                  Банк задач
                </LinkButton>
              </div>
            </Panel>

            <Panel>
              <div className="panel-header">
                <h2>Диагностика</h2>
                <BarChart3 aria-hidden="true" />
              </div>
              <p>Если список пуст или роль определилась неверно, приложите источник и ошибку в diagnostics.</p>
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
