import { BarChart3, BookOpenCheck, DatabaseZap, Home, MessageCircle, UsersRound } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { masteryRows, teacherRows } from "@/lib/demo-data";

export default function TeacherDashboardPage() {
  const config = getPublicConfig();

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
          <a href="/dashboard/teacher#students">
            <UsersRound aria-hidden="true" /> Ученики
          </a>
          <a href="/dashboard/teacher#task-bank">
            <DatabaseZap aria-hidden="true" /> Банк задач
          </a>
          <a href="/dashboard/teacher#analytics">
            <BarChart3 aria-hidden="true" /> Аналитика
          </a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <Badge>teacher · invite-only</Badge>
            <h1>Кабинет преподавателя</h1>
            <p>Плотная панель для учеников, домашек, банка задач и прогресса по прототипам.</p>
          </div>
          <LinkButton href={config.telegramUrl} variant="secondary">
            <MessageCircle aria-hidden="true" />
            Telegram
          </LinkButton>
        </header>

        <div className="metric-grid">
          <MetricCard label="Ученики" value="3 demo" detail="реальные только после invite" />
          <MetricCard label="ДЗ к проверке" value="1" detail="short answer flow" />
          <MetricCard label="Task bank" value="dry-run" detail="без прямого импорта" />
          <MetricCard label="Consent" value="strict" detail="public only granted" />
        </div>

        <div className="dashboard-grid">
          <Panel id="students">
            <div className="panel-header">
              <h2>Ученики и ближайшие шаги</h2>
              <Badge>demo seed</Badge>
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
                {teacherRows.map((row) => (
                  <tr key={row.student}>
                    <td>{row.student}</td>
                    <td>{row.track}</td>
                    <td>{row.next}</td>
                    <td>{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="stack">
            <Panel id="task-bank">
              <div className="panel-header">
                <h2>Task bank sync</h2>
                <DatabaseZap aria-hidden="true" />
              </div>
              <p>
                `pnpm tasks:sync --dry-run` считает import/update/skip/duplicates/manual-review и не трогает
                локальный корпус без явного `--apply`.
              </p>
              <LinkButton href="/api/health" variant="secondary">
                Проверить health
              </LinkButton>
            </Panel>

            <Panel id="analytics">
              <div className="panel-header">
                <h2>Mastery snapshot</h2>
                <BookOpenCheck aria-hidden="true" />
              </div>
              <div className="stack">
                {masteryRows.map((row) => (
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
          </div>
        </div>
      </section>
    </main>
  );
}
