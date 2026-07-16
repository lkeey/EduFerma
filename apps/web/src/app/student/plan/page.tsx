import { Badge, MetricCard, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentPlan, getDemoStudent } from "@/lib/platform/data";

export default async function StudentPlanPage() {
  await requireStudentAccess("demo_student_oge");
  const plan = await getStudentPlan();
  const student = getDemoStudent();

  return (
    <PlatformShell role="student" title="Мой план" subtitle={student.goalSummary}>
      <div className="metric-grid">
        <MetricCard label="Трек" value={student.learningTrack} detail={`экзамен ${student.examYear}`} />
        <MetricCard
          label="Цель"
          value={plan?.goalSummary ?? student.targetGrade ?? "—"}
          detail={plan?.deadline ? new Date(plan.deadline).toLocaleDateString("ru-RU") : "без даты"}
        />
        <MetricCard label="Версия" value={String(plan?.versionNo ?? 0)} detail={plan?.status ?? "нет плана"} />
        <MetricCard
          label="Ритм"
          value={plan?.sessionsPerWeek ? `${plan.sessionsPerWeek} в неделю` : "не задан"}
          detail={plan?.sessionDurationMinutes ? `${plan.sessionDurationMinutes} минут` : undefined}
        />
        <MetricCard label="Занятий" value={String(plan?.lessons.length ?? 0)} detail="в текущем плане" />
      </div>
      <Panel>
        <div className="panel-header"><h2>Стратегия</h2><Badge>student-safe</Badge></div>
        <p>{plan?.strategy ?? "План будет опубликован преподавателем."}</p>
      </Panel>
      <Panel>
        <div className="panel-header"><h2>Занятия плана</h2><Badge>teacher notes hidden</Badge></div>
        <table className="data-table">
          <thead><tr><th>#</th><th>Дата</th><th>Тема</th><th>Фокус</th><th>Skill atoms</th><th>Статус</th></tr></thead>
          <tbody>
            {plan?.lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{lesson.lessonNo}</td>
                <td>{lesson.plannedDate}</td>
                <td>{lesson.title}</td>
                <td>{lesson.studentSummary}</td>
                <td>{lesson.skillAtoms.join(", ")}</td>
                <td><Badge>{lesson.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
