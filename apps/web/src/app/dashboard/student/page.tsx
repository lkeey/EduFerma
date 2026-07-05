import { BookOpenCheck, CalendarDays, Home, LineChart, LockKeyhole, MessageCircle } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { SetupRequiredError } from "@eduferma/core";
import { requirePageRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const config = getPublicConfig();
  try {
    await requirePageRole("/dashboard/student", roles.student);
  } catch {
    redirect("/sign-in");
  }

  let data: Awaited<ReturnType<ReturnType<typeof getServices>["student"]["getDashboard"]>> | null = null;
  let setupRequired = false;
  try {
    data = await getServices().student.getDashboard();
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
        <nav aria-label="Student navigation">
          <a aria-current="page" href="/dashboard/student">
            <Home aria-hidden="true" /> Обзор
          </a>
          <a href="/dashboard/student#assignments">
            <BookOpenCheck aria-hidden="true" /> ДЗ
          </a>
          <a href="/dashboard/student#progress">
            <LineChart aria-hidden="true" /> Прогресс
          </a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <Badge>ученик · demo seed</Badge>
            <h1>Кабинет ученика</h1>
            <p>Домашка, ближайшие занятия и прогресс по навыкам без ответов до разрешения.</p>
          </div>
          <LinkButton href={config.telegramUrl} variant="secondary">
            <MessageCircle aria-hidden="true" />
            Написать
          </LinkButton>
        </header>

        <div className="metric-grid">
          <MetricCard label="Ближайшее занятие" value={data?.schedule[0]?.title || "DB setup"} detail="remote DB required" />
          <MetricCard label="Домашка" value={String(data?.assignments.length || 0)} detail="из API/service layer" />
          <MetricCard label="Средний прогресс" value={data ? `${Math.round(data.progress.reduce((sum, row) => sum + row.value, 0) / data.progress.length)}%` : "0%"} detail="по skill atoms" />
          <MetricCard label="Ответы" value="скрыты" detail="до сдачи или разрешения" />
        </div>

        {setupRequired ? (
          <Panel>
            <div className="panel-header">
              <h2>Remote DB не подключена</h2>
              <LockKeyhole aria-hidden="true" />
            </div>
            <p>Production данные появятся после настройки `DATABASE_URL`, migrations и seed/import pipeline.</p>
          </Panel>
        ) : null}

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
                {(data?.assignments || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.due_at || "не задан"}</td>
                    <td>{row.score || "ожидается"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="stack">
            <Panel id="progress">
              <div className="panel-header">
                <h2>Skill atoms</h2>
                <CalendarDays aria-hidden="true" />
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

            <Panel>
              <div className="panel-header">
                <h2>Проверка доступа</h2>
                <LockKeyhole aria-hidden="true" />
              </div>
              <p>Ученик видит условия, статусы и свои попытки. Учительские ответы остаются закрытыми.</p>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}
