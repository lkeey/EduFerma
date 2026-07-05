import { notFound } from "next/navigation";
import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudentDetail } from "@/lib/platform/data";

export default async function TeacherStudentAssignmentsPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireTeacherAccess();
  const { studentId } = await params;
  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) notFound();

  return (
    <PlatformShell role="teacher" title={`ДЗ: ${detail.student.displayName}`} subtitle="Статусы, попытки и действия">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Название</th><th>Статус</th><th>Прогресс</th><th>Действия</th></tr></thead>
          <tbody>
            {detail.assignments.map(({ assignment, progress }) => (
              <tr key={assignment.id}>
                <td>{assignment.title}</td>
                <td><Badge>{assignment.status}</Badge></td>
                <td>{progress.submitted}/{progress.total} · {progress.score}</td>
                <td><LinkButton href="/teacher/reviews" variant="secondary">Review</LinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
