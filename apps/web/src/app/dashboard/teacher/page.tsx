import { BarChart3, BookOpenCheck, DatabaseZap, Home, MessageCircle, UsersRound } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { SetupRequiredError } from "@eduferma/core";
import { requirePageRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const config = getPublicConfig();
  try {
    await requirePageRole("/dashboard/teacher", roles.teacher);
  } catch {
    redirect("/sign-in");
  }

  let data: Awaited<ReturnType<ReturnType<typeof getServices>["teacher"]["getDashboard"]>> | null = null;
  let setupRequired = false;
  try {
    data = await getServices().teacher.getDashboard();
  } catch (error) {
    if (error instanceof SetupRequiredError) setupRequired = true;
    else throw error;
  }

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
          <MetricCard label="Ученики" value={String(data?.students.length || 0)} detail="из service layer" />
          <MetricCard label="ДЗ к проверке" value={String(data?.pendingReview || 0)} detail="short answer flow" />
          <MetricCard label="Task bank" value={setupRequired ? "DB setup" : "API"} detail="без прямого импорта" />
          <MetricCard label="Consent" value="strict" detail="public only granted" />
        </div>

        {setupRequired ? (
          <Panel>
            <div className="panel-header">
              <h2>Remote DB не подключена</h2>
              <DatabaseZap aria-hidden="true" />
            </div>
            <p>Production source of truth должен быть Neon/managed Postgres через `DATABASE_URL`.</p>
          </Panel>
        ) : null}

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
                {(data?.students || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.display_name}</td>
                    <td>{row.learning_track}</td>
                    <td>{row.next_topic || "не задано"}</td>
                    <td>{row.risk || "не задан"}</td>
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
                {(data?.progress || []).map((row) => (
                  <div key={row.skill_atom}>
                    <div className="panel-header">
                      <span>{row.skill_atom}</span>
                      <Badge>{row.value}%</Badge>
                    </div>
                    <ProgressBar value={row.value} label={row.skill_atom} />
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
