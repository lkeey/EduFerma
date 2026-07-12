import { BarChart3, BookOpenCheck, CalendarDays, Home, LineChart, LockKeyhole, MessageCircle } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { getStudentDashboardData } from "@/lib/platform/dashboard";
import { requirePlatformPath } from "@/lib/platform/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const access = await requirePlatformPath("/dashboard/student");
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
          <a aria-current="page" href="/dashboard/student">
            <Home aria-hidden="true" /> Обзор
          </a>
          <a href="/dashboard/student/assignments">
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
            <Badge>ученик · {dashboard.source.kind}</Badge>
            <h1>Кабинет ученика</h1>
            <p>Домашка, ближайшие занятия и прогресс по навыкам без ответов до разрешения.</p>
            {dashboard.source.reason ? <p>{dashboard.source.reason}</p> : null}
          </div>
          <div className="topbar-actions">
            <LinkButton href="/dashboard/student/assignments" variant="secondary">
              <BookOpenCheck aria-hidden="true" />
              ДЗ
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              <MessageCircle aria-hidden="true" />
              Написать
            </LinkButton>
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="Ближайшее занятие" value={dashboard.metrics.nextLesson} detail="из service layer" />
          <MetricCard label="Домашка" value={dashboard.metrics.activeAssignments} detail="активные и последние" />
          <MetricCard label="Средний прогресс" value={dashboard.metrics.averageProgress} detail="по skill atoms" />
          <MetricCard label="Ответы" value={dashboard.metrics.answers} detail="до сдачи или разрешения" />
        </div>

        <div className="dashboard-grid">
          <Panel id="assignments">
            <div className="panel-header">
              <h2>Домашние задания</h2>
              <Badge>short answer</Badge>
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
                {dashboard.assignments.map((row) => (
                  <tr key={`${row.title}:${row.due}`}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.due}</td>
                    <td>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <LinkButton href="/dashboard/student/assignments" variant="secondary">
              Открыть все ДЗ
            </LinkButton>
          </Panel>

          <div className="stack">
            <Panel id="progress">
              <div className="panel-header">
                <h2>Skill atoms</h2>
                <CalendarDays aria-hidden="true" />
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
            </Panel>

            <Panel>
              <div className="panel-header">
                <h2>Проверка доступа</h2>
                <LockKeyhole aria-hidden="true" />
              </div>
              <p>Ученик видит условия, статусы и свои попытки. Учительские ответы остаются закрытыми.</p>
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
