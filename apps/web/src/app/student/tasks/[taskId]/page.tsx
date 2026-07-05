import { notFound } from "next/navigation";
import { Badge, Panel } from "@eduferma/ui";
import { AnswerForm } from "@/components/platform/answer-form";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentTask, getTeacherTask } from "@/lib/platform/data";

export default async function StudentTaskPage({
  params,
  searchParams
}: {
  params: Promise<{ taskId: string }>;
  searchParams?: Promise<{ assignmentId?: string }>;
}) {
  await requireStudentAccess("demo_student_oge");
  const { taskId } = await params;
  const query = searchParams ? await searchParams : {};
  const task = await getStudentTask(taskId);
  const teacherTask = await getTeacherTask(taskId);
  if (!task || !teacherTask) notFound();

  return (
    <PlatformShell role="student" title="Решение задачи" subtitle={`${task.exam ?? task.learningTrack} · ${task.topic}`}>
      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header">
            <h2>Условие</h2>
            <Badge>{task.difficultyLevel}</Badge>
          </div>
          <p>{task.statementMd}</p>
          <p className="muted-text">Ответы и решения скрыты для ученика до разрешения преподавателя.</p>
        </Panel>
        <Panel>
          <div className="panel-header">
            <h2>Отправить ответ</h2>
            <Badge>{teacherTask.answerJson?.type ?? "manual"}</Badge>
          </div>
          <AnswerForm taskId={task.id} assignmentId={query.assignmentId ?? "assignment_demo_1"} answerType={teacherTask.answerJson?.type ?? "manual"} />
        </Panel>
      </div>
    </PlatformShell>
  );
}
