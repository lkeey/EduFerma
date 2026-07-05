import { Badge, LinkButton, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherTaskBank, getTeacherStudents } from "@/lib/platform/data";

export default async function TeacherNewAssignmentPage() {
  await requireTeacherAccess();
  const students = await getTeacherStudents();
  const tasks = await getTeacherTaskBank({ status: "active" });

  return (
    <PlatformShell role="teacher" title="Создать ДЗ" subtitle="MVP preview: выбор ученика, дедлайна и задач">
      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header"><h2>Настройки</h2><Badge>preview</Badge></div>
          <label className="field-label">Ученик</label>
          <select className="text-field" defaultValue={students[0]?.student.id}>{students.map(({ student }) => <option key={student.id} value={student.id}>{student.displayName}</option>)}</select>
          <label className="field-label">Название</label>
          <input className="text-field" defaultValue="Новое домашнее задание" />
          <label className="field-label">Дедлайн</label>
          <input className="text-field" type="date" defaultValue="2026-07-12" />
          <div className="hero-actions"><LinkButton href="/teacher/assignments" variant="primary">Publish demo</LinkButton></div>
        </Panel>
        <Panel>
          <div className="panel-header"><h2>Задачи</h2><Badge>{tasks.length}</Badge></div>
          {tasks.slice(0, 6).map((task) => <p key={task.id}>{task.topic} · {task.difficultyLevel}</p>)}
        </Panel>
      </div>
    </PlatformShell>
  );
}
