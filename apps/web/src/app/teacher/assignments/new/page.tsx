import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { AssignmentComposer } from "@/components/platform/assignment-composer";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherTaskBank, getTeacherStudents } from "@/lib/platform/data";

export default async function TeacherNewAssignmentPage() {
  await requireTeacherAccess();
  const students = await getTeacherStudents();
  const tasks = await getTeacherTaskBank({ status: "active" });

  return (
    <PlatformShell
      role="teacher"
      title="Создать ДЗ"
      subtitle="Выберите ученика, задачи и сразу выдайте домашнее задание"
      actions={<LinkButton href="/teacher/assignments" variant="secondary">Все ДЗ</LinkButton>}
    >
      <div className="dashboard-grid dashboard-grid-wide">
        <Panel>
          <div className="panel-header">
            <h2>Новое домашнее задание</h2>
            <Badge>{tasks.length} задач доступно</Badge>
          </div>
          {students.length > 0 && tasks.length > 0 ? (
            <AssignmentComposer
              students={students.map(({ student }) => ({
                id: student.id,
                displayName: student.displayName,
                learningTrack: student.learningTrack
              }))}
              tasks={tasks.map((task) => ({
                id: task.id,
                taskId: task.taskId,
                topic: task.topic,
                exam: task.exam,
                taskNumber: task.taskNumber,
                difficultyLevel: task.difficultyLevel,
                statementMd: task.statementMd,
                skillAtoms: task.skillAtoms
              }))}
            />
          ) : (
            <div className="notice">
              <Badge>setup</Badge>
              <p>Для создания ДЗ нужны хотя бы один ученик и одна активная задача в банке.</p>
            </div>
          )}
        </Panel>
      </div>
    </PlatformShell>
  );
}
