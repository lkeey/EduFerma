import { BarChart3, BookOpenCheck, DatabaseZap, Home, MessageCircle, UsersRound } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { getTeacherDashboardData } from "@/lib/platform/dashboard";
import { requirePlatformPath } from "@/lib/platform/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const access = await requirePlatformPath("/dashboard/teacher");
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
          <a aria-current="page" href="/dashboard/teacher">
            <Home aria-hidden="true" /> Обзор
          </a>
          <a href="/dashboard/teacher/students">
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
          <a href="/dashboard/teacher#analytics">
            <BarChart3 aria-hidden="true" /> Аналитика
          </a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <Badge>teacher · {dashboard.source.kind}</Badge>
            <h1>Кабинет преподавателя</h1>
            <p>Плотная панель для учеников, домашек, банка задач и прогресса по прототипам.</p>
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
          <MetricCard label="Ученики" value={dashboard.metrics.students} detail="из service layer" />
          <MetricCard label="ДЗ к проверке" value={dashboard.metrics.assignmentsToReview} detail="submitted" />
          <MetricCard label="Task bank" value={dashboard.metrics.taskBank} detail="без ответов и решений" />
          <MetricCard label="Consent" value={dashboard.metrics.consent} detail="public only granted" />
        </div>

        <div className="dashboard-grid">
          <Panel id="students">
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
                {dashboard.students.map((row) => (
                  <tr key={row.student}>
                    <td>{row.student}</td>
                    <td>{row.track}</td>
                    <td>{row.next}</td>
                    <td>{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <LinkButton href="/dashboard/teacher/students" variant="secondary">
              Открыть раздел учеников
            </LinkButton>
          </Panel>

          <div className="stack">
            <Panel id="task-bank">
              <div className="panel-header">
                <h2>Task bank sync</h2>
                <DatabaseZap aria-hidden="true" />
              </div>
              <p>
                API task bank видит {dashboard.taskBank.activeTasks} active / {dashboard.taskBank.totalTasks} total
                задач. В payload не отдаются ответы, решения и teacher-only поля.
              </p>
              <div className="topbar-actions">
                <LinkButton href="/task-bank" variant="secondary">
                  Открыть банк задач
                </LinkButton>
                <LinkButton href="/api/v1/task-bank" variant="secondary">
                  Открыть API
                </LinkButton>
              </div>
            </Panel>

            <Panel id="analytics">
              <div className="panel-header">
                <h2>Mastery snapshot</h2>
                <BookOpenCheck aria-hidden="true" />
              </div>
              <div className="stack">
                {dashboard.mastery.map((row) => (
                  <div key={row.skill}>
                    <div className="panel-header">
                      <span>{row.skill}</span>
                      <Badge>{row.value}%</Badge>
                    </div>
                    <ProgressBar value={row.value} label={row.skill} />
                  </div>
                ))}
              </div>
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
