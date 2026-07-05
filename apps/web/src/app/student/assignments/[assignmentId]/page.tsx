import { notFound } from "next/navigation";
import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getAssignmentDetail } from "@/lib/platform/data";

export default async function StudentAssignmentDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  await requireStudentAccess("demo_student_oge");
  const { assignmentId } = await params;
  const detail = await getAssignmentDetail(assignmentId, true);
  if (!detail) notFound();

  return (
    <PlatformShell role="student" title={detail.assignment.title} subtitle={detail.assignment.descriptionMd}>
      <Panel>
        <div className="panel-header">
          <h2>Задачи</h2>
          <Badge>{detail.progress.score}</Badge>
        </div>
        <table className="data-table">
          <thead><tr><th>#</th><th>Тема</th><th>Сложность</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {detail.tasks.map((task, index) => {
              const attempt = detail.attempts.find((item) => item.taskId === task.id);
              return (
                <tr key={task.id}>
                  <td>{index + 1}</td>
                  <td>{task.topic}</td>
                  <td><Badge>{task.difficultyLevel}</Badge></td>
                  <td>{attempt?.checkStatus ?? "not_started"}</td>
                  <td><LinkButton href={`/student/tasks/${task.id}?assignmentId=${detail.assignment.id}`} variant="primary">Решать</LinkButton></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
