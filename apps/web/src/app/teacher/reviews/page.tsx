import { Badge, Panel } from "@eduferma/ui";
import { ReviewAttemptForm } from "@/components/platform/review-attempt-form";
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
          <thead><tr><th>Попытка</th><th>Задача</th><th>Ответ</th><th>Статус</th><th>Проверка</th></tr></thead>
          <tbody>
            {dashboard.pendingReview.length > 0 ? dashboard.pendingReview.map((attempt) => (
              <tr key={attempt.id}>
                <td><code>{attempt.id}</code></td>
                <td>{attempt.taskId ?? "—"}</td>
                <td>{attempt.answerJson?.value ?? "—"}</td>
                <td><Badge>{attempt.checkStatus ?? "pending_review"}</Badge></td>
                <td><ReviewAttemptForm attemptId={attempt.id} /></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>Очередь проверки пуста.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
