import { Badge, LinkButton, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentDashboard } from "@/lib/platform/data";

export default async function StudentDashboardPage() {
  await requireStudentAccess("demo_student_oge");
  const dashboard = await getStudentDashboard();

  return (
    <PlatformShell role="student" title="Кабинет ученика" subtitle={`Здравствуйте, ${dashboard.student.displayName}. Продолжаем подготовку.`}>
      <div className="metric-grid">
        <MetricCard label="Ближайшее занятие" value={dashboard.nextLesson?.title ?? "Нет"} detail={dashboard.nextLesson?.startsAt ?? "Расписание пустое"} />
        <MetricCard label="Активное ДЗ" value={dashboard.activeAssignment?.title ?? "Нет"} detail={dashboard.activeAssignmentProgress?.score ?? "0 / 0"} />
        <MetricCard label="Прогресс ДЗ" value={`${dashboard.activeAssignmentProgress?.percent ?? 0}%`} detail="по назначенным задачам" />
        <MetricCard label="Слабые темы" value={String(dashboard.weakSkills.length)} detail="требуют повторения" />
      </div>
      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header">
            <h2>Продолжить</h2>
            <Badge>student safe</Badge>
          </div>
          <p>{dashboard.activeAssignment?.descriptionMd ?? "Пока нет активного задания."}</p>
          <div className="hero-actions">
            <LinkButton href={`/student/assignments/${dashboard.activeAssignment?.id ?? "assignment_demo_1"}`} variant="primary">Открыть ДЗ</LinkButton>
            <LinkButton href="/student/plan" variant="secondary">Мой план</LinkButton>
            <LinkButton href="/student/schedule" variant="secondary">Расписание</LinkButton>
          </div>
        </Panel>
        <Panel>
          <div className="panel-header">
            <h2>Skill atoms</h2>
            <LinkButton href="/student/progress" variant="ghost">Все</LinkButton>
          </div>
          <div className="stack">
            {dashboard.weakSkills.map((skill) => (
              <div key={skill.skillAtom}>
                <div className="panel-header">
                  <span>{skill.skillAtom}</span>
                  <Badge>{Math.round(skill.confidence * 100)}%</Badge>
                </div>
                <ProgressBar value={Math.round(skill.confidence * 100)} label={skill.skillAtom} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PlatformShell>
  );
}
