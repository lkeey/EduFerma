import { BookOpenCheck, CalendarDays, Home, LineChart, LockKeyhole, MessageCircle } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { assignmentRows, masteryRows } from "@/lib/demo-data";

export default function StudentDashboardPage() {
  const config = getPublicConfig();

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
          <MetricCard label="Ближайшее занятие" value="Сегодня" detail="ЕГЭ 7 · графики" />
          <MetricCard label="Домашка" value="2 активных" detail="1 к проверке" />
          <MetricCard label="Средний прогресс" value="71%" detail="по demo skill atoms" />
          <MetricCard label="Ответы" value="скрыты" detail="до сдачи или разрешения" />
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
                {assignmentRows.map((row) => (
                  <tr key={row.title}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.due}</td>
                    <td>{row.score}</td>
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
