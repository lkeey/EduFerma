import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudents } from "@/lib/platform/data";

export default async function TeacherStudentsPage() {
  await requireTeacherAccess();
  const rows = await getTeacherStudents();

  return (
    <PlatformShell role="teacher" title="Ученики" subtitle="Список учеников и ближайшие шаги">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Ученик</th><th>Трек</th><th>Цель</th><th>Ближайшее занятие</th><th>Риск</th><th /></tr></thead>
          <tbody>
            {rows.map(({ student, nextLesson, activeAssignments }) => (
              <tr key={student.id}>
                <td>{student.displayName}</td>
                <td>{student.learningTrack}</td>
                <td>{student.goalSummary}</td>
                <td>{nextLesson?.title ?? "—"}</td>
                <td><Badge>{student.riskLevel}</Badge></td>
                <td><LinkButton href={`/teacher/students/${student.id}`} variant="secondary">Открыть</LinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
