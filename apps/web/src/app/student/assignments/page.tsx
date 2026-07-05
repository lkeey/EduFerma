import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentAssignments } from "@/lib/platform/data";

export default async function StudentAssignmentsPage() {
  await requireStudentAccess("demo_student_oge");
  const rows = await getStudentAssignments();

  return (
    <PlatformShell role="student" title="Домашние задания" subtitle="Назначенные задания и статус выполнения">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Название</th><th>Дедлайн</th><th>Статус</th><th>Прогресс</th><th /></tr></thead>
          <tbody>
            {rows.map(({ assignment, progress }) => (
              <tr key={assignment.id}>
                <td>{assignment.title}</td>
                <td>{assignment.dueAt}</td>
                <td><Badge>{assignment.status}</Badge></td>
                <td>{progress.submitted}/{progress.total} · {progress.score}</td>
                <td><LinkButton href={`/student/assignments/${assignment.id}`} variant="secondary">Открыть</LinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
