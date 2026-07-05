import { Badge, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherDashboard } from "@/lib/platform/data";

export default async function TeacherReviewsPage() {
  await requireTeacherAccess();
  const dashboard = await getTeacherDashboard();

  return (
    <PlatformShell role="teacher" title="Проверка попыток" subtitle="Manual review, score, feedback, mistake tags">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Попытка</th><th>Задача</th><th>Ответ</th><th>Статус</th><th>Feedback</th></tr></thead>
          <tbody>
            {dashboard.pendingReview.map((attempt) => (
              <tr key={attempt.id}>
                <td>{attempt.id}</td>
                <td>{attempt.taskId}</td>
                <td>{attempt.answerJson?.value}</td>
                <td><Badge>{attempt.checkStatus}</Badge></td>
                <td>{attempt.feedbackMd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
