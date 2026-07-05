import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getStudentAssignments } from "@/lib/platform/data";

export default async function TeacherAssignmentsPage() {
  await requireTeacherAccess();
  const rows = await getStudentAssignments();

  return (
    <PlatformShell role="teacher" title="Домашние задания" subtitle="Все ДЗ ученика demo_student_oge" actions={<LinkButton href="/teacher/assignments/new" variant="primary">Создать</LinkButton>}>
      <Panel>
        <table className="data-table">
          <thead><tr><th>Название</th><th>Статус</th><th>Прогресс</th><th /></tr></thead>
          <tbody>
            {rows.map(({ assignment, progress }) => (
              <tr key={assignment.id}><td>{assignment.title}</td><td><Badge>{assignment.status}</Badge></td><td>{progress.score}</td><td><LinkButton href="/teacher/reviews" variant="secondary">Попытки</LinkButton></td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
