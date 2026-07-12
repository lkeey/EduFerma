import { BarChart3, DatabaseZap, Home, MessageCircle } from "lucide-react";
import { Badge, LinkButton, MetricCard, Panel } from "@eduferma/ui";
import { getPublicConfig } from "@eduferma/config";
import { getPlatformTaskBank } from "@/lib/platform/dashboard";

export const dynamic = "force-dynamic";

export default async function TaskBankPage() {
  const config = getPublicConfig();
  const taskBank = await getPlatformTaskBank();

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="brand-mark" href="/">
          <span>EF</span>
          <span>EduFerma</span>
        </a>
        <nav aria-label="Task bank navigation">
          <a href="/">
            <Home aria-hidden="true" /> Главная
          </a>
          <a aria-current="page" href="/task-bank">
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
            <Badge>task bank · {taskBank.source.kind}</Badge>
            <h1>Банк задач</h1>
            <p>Публичная MVP-сводка корпуса задач без ответов, решений и teacher-only полей.</p>
            {taskBank.source.reason ? <p>{taskBank.source.reason}</p> : null}
          </div>
          <div className="topbar-actions">
            <LinkButton href="/api/v1/task-bank" variant="secondary">
              <DatabaseZap aria-hidden="true" />
              API
            </LinkButton>
            <LinkButton href={config.telegramUrl} variant="secondary">
              <MessageCircle aria-hidden="true" />
              Telegram
            </LinkButton>
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="Всего задач" value={String(taskBank.totalTasks)} detail="из task-bank service" />
          <MetricCard label="Активные" value={String(taskBank.activeTasks)} detail="status = active" />
          <MetricCard label="Источник" value={taskBank.source.kind} detail={taskBank.source.reason ?? "актуальный payload"} />
        </div>

        <div className="dashboard-grid">
          <Panel>
            <div className="panel-header">
              <h2>Последние задачи</h2>
              <Badge>{taskBank.tasks.length} в выдаче</Badge>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Трек</th>
                  <th>Задание</th>
                  <th>Прототип</th>
                  <th>Источник</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {taskBank.tasks.length ? (
                  taskBank.tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.taskId}</td>
                      <td>{task.learningTrack}</td>
                      <td>{task.taskNumber ?? task.topic ?? "не указано"}</td>
                      <td>{task.prototypeId ?? "needs_review"}</td>
                      <td>{task.sourceUrl ? <a href={task.sourceUrl}>{task.sourceName}</a> : task.sourceName}</td>
                      <td>{task.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>В текущем источнике пока нет задач для таблицы. Проверьте импорт или API payload.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <div className="stack">
            <Panel>
              <div className="panel-header">
                <h2>API-контракт</h2>
                <DatabaseZap aria-hidden="true" />
              </div>
              <p>
                `/api/v1/task-bank` отдаёт только безопасные summary-поля. Если API вернул 401/403 или пустой payload,
                приложите это состояние к диагностике.
              </p>
              <LinkButton href="/api/v1/task-bank" variant="secondary">
                Открыть JSON
              </LinkButton>
            </Panel>

            <Panel>
              <div className="panel-header">
                <h2>Диагностика</h2>
                <BarChart3 aria-hidden="true" />
              </div>
              <p>Для ошибок импорта, доступа или пустой БД используйте diagnostics как место для воспроизведения.</p>
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
