import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherAssignments } from "@/lib/platform/data";

export default async function TeacherAssignmentsPage() {
  await requireTeacherAccess();
  const rows = await getTeacherAssignments();

  return (
    <PlatformShell
      role="teacher"
      title="Домашние задания"
      subtitle="Все назначенные и черновые ДЗ по видимым ученикам"
      actions={<LinkButton href="/teacher/assignments/new" variant="primary">Создать</LinkButton>}
    >
      <Panel>
        <table className="data-table">
          <thead><tr><th>Ученик</th><th>Название</th><th>Статус</th><th>Прогресс</th><th /></tr></thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map(({ student, assignment, progress }) => (
                <tr key={assignment.id}>
                  <td>{student.displayName}</td>
                  <td>{assignment.title}</td>
                  <td><Badge>{assignment.status}</Badge></td>
                  <td>{progress.submitted}/{progress.total} · {progress.score}</td>
                  <td><LinkButton href={`/teacher/students/${student.id}/assignments`} variant="secondary">Открыть</LinkButton></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Домашние задания пока не созданы. Начните с кнопки "Создать".</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
