import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentPracticeTasks } from "@/lib/platform/data";

export default async function StudentTaskBankPage() {
  await requireStudentAccess("demo_student_oge");
  const tasks = await getStudentPracticeTasks();

  return (
    <PlatformShell role="student" title="Практика" subtitle="Безопасный список задач без ответов и решений">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Тема</th><th>Экзамен</th><th>Сложность</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.topic}</td>
                <td>{task.exam ?? task.learningTrack}</td>
                <td><Badge>{task.difficultyLevel}</Badge></td>
                <td>{task.visibility.join(", ")}</td>
                <td><LinkButton href={`/student/tasks/${task.id}?assignmentId=${task.assignmentId ?? ""}`} variant="secondary">Решать</LinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
