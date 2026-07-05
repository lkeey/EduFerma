import { Badge, LinkButton, MetricCard, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherDashboard } from "@/lib/platform/data";

export default async function TeacherDashboardPage() {
  await requireTeacherAccess();
  const dashboard = await getTeacherDashboard();

  return (
    <PlatformShell role="teacher" title="Кабинет преподавателя" subtitle="Ученики, ДЗ, попытки и быстрые действия">
      <div className="metric-grid">
        <MetricCard label="Ученики" value={String(dashboard.students.length)} />
        <MetricCard label="Ближайшие занятия" value={String(dashboard.nextLessons.length)} />
        <MetricCard label="На проверку" value={String(dashboard.pendingReview.length)} />
        <MetricCard label="Needs review" value={String(dashboard.needsReviewTasks.length)} />
      </div>
      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header"><h2>Быстрые действия</h2><Badge>teacher</Badge></div>
          <div className="hero-actions">
            <LinkButton href="/teacher/assignments/new" variant="primary">Создать ДЗ</LinkButton>
            <LinkButton href="/teacher/task-bank" variant="secondary">Банк задач</LinkButton>
            <LinkButton href="/teacher/students" variant="secondary">Ученики</LinkButton>
          </div>
        </Panel>
        <Panel>
          <div className="panel-header"><h2>Последние попытки</h2><LinkButton href="/teacher/reviews" variant="ghost">Проверка</LinkButton></div>
          <table className="data-table">
            <tbody>
              {dashboard.recentAttempts.map((attempt) => (
                <tr key={attempt.id}><td>{attempt.taskId}</td><td>{attempt.checkStatus}</td><td>{attempt.feedbackMd}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </PlatformShell>
  );
}
