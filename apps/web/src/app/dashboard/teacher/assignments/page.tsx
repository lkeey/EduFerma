import { BarChart3, BookOpenCheck, DatabaseZap, Home, MessageCircle, UsersRound } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { getStudentDashboardData, getTeacherDashboardData } from "@/lib/platform/dashboard";
import { requirePlatformPath } from "@/lib/platform/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentsPage() {
  const access = await requirePlatformPath("/dashboard/teacher/assignments");
  if (!access.ok) {
    redirect(access.redirectTo);
  }

  const config = getPublicConfig();
  const [teacherDashboard, assignmentsDashboard] = await Promise.all([
    getTeacherDashboardData(),
    getStudentDashboardData()
  ]);
  const sourceReason = teacherDashboard.source.reason ?? assignmentsDashboard.source.reason;

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
          <a href="/dashboard/teacher/students">
            <UsersRound aria-hidden="true" /> Ученики
          </a>
          <a aria-current="page" href="/dashboard/teacher/assignments">
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
            <Badge>
              teacher · {teacherDashboard.source.kind} / {assignmentsDashboard.source.kind}
            </Badge>
            <h1>Домашние задания учеников</h1>
            <p>Учительский MVP-список ДЗ: статусы, дедлайны и результаты без раскрытия решений ученику.</p>
            {sourceReason ? <p>{sourceReason}</p> : null}
          </div>
          <div className="topbar-actions">
            <LinkButton href="/dashboard/teacher/students" variant="secondary">
              <UsersRound aria-hidden="true" />
              Ученики
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              <MessageCircle aria-hidden="true" />
              Telegram
            </LinkButton>
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="ДЗ к проверке" value={teacherDashboard.metrics.assignmentsToReview} detail="submitted" />
          <MetricCard label="Всего в списке" value={String(assignmentsDashboard.assignments.length)} detail="service layer" />
          <MetricCard label="Ученики" value={teacherDashboard.metrics.students} detail="для сверки назначения" />
        </div>

        <div className="dashboard-grid">
          <Panel>
            <div className="panel-header">
              <h2>Домашки</h2>
              <Badge>{assignmentsDashboard.source.kind}</Badge>
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
                {assignmentsDashboard.assignments.length ? (
                  assignmentsDashboard.assignments.map((row) => (
                    <tr key={`${row.title}:${row.due}`}>
                      <td>{row.title}</td>
                      <td>{row.status}</td>
                      <td>{row.due}</td>
                      <td>{row.score}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>Домашки пока не найдены. Проверьте БД, seed/demo или импорт assignments.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <div className="stack">
            <Panel>
              <div className="panel-header">
                <h2>Ученики</h2>
                <UsersRound aria-hidden="true" />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ученик</th>
                    <th>Трек</th>
                    <th>Следующая тема</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherDashboard.students.length ? (
                    teacherDashboard.students.map((row) => (
                      <tr key={row.student}>
                        <td>{row.student}</td>
                        <td>{row.track}</td>
                        <td>{row.next}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>Ученики пока не подключены.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>

            <Panel>
              <div className="panel-header">
                <h2>Диагностика</h2>
                <BarChart3 aria-hidden="true" />
              </div>
              <p>Если назначения не совпадают с ожиданием, приложите список ДЗ и источник данных в diagnostics.</p>
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
