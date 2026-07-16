import { notFound } from "next/navigation";
import { Badge, MetricCard, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudentDetail } from "@/lib/platform/data";

export default async function TeacherStudentAnalyticsPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireTeacherAccess();
  const { studentId } = await params;
  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) notFound();

  return (
    <PlatformShell role="teacher" title={`Аналитика: ${detail.student.displayName}`} subtitle="Rule-based рекомендации MVP">
      <div className="metric-grid">
        <MetricCard label="Решено" value={String(detail.analytics.checked_attempt_accuracy.checked)} />
        <MetricCard label="Точность" value={`${detail.analytics.checked_attempt_accuracy.percent}%`} />
        <MetricCard label="Pending review" value={String(detail.attempts.filter((item) => item.checkStatus === "pending_review").length)} />
        <MetricCard label="Слабых навыков" value={String(detail.mastery.weakSkills.length)} />
      </div>
      <div className="metric-grid">
        <MetricCard label="Статус траектории" value={detail.analytics.forecast_status} detail={detail.analytics.forecast_reason} />
        <MetricCard label="План" value={`${detail.analytics.plan_completion.percent}%`} detail={`${detail.analytics.plan_completion.completed_lessons}/${detail.analytics.plan_completion.total_lessons}`} />
        <MetricCard label="ДЗ" value={`${detail.analytics.homework_completion.percent}%`} detail={`просрочено ${detail.analytics.homework_completion.overdue_assignments}`} />
        <MetricCard label="Время" value={`${Math.round(detail.analytics.time_spent.total_seconds / 60)} мин`} detail={`среднее ${Math.round(detail.analytics.time_spent.average_seconds_per_attempt / 60)} мин`} />
      </div>
      <Panel>
        <div className="panel-header"><h2>Weak areas</h2><Badge>skill_atoms</Badge></div>
        {detail.mastery.weakSkills.map((skill) => <p key={skill.skillAtom}>{skill.skillAtom}: {skill.riskFlag ?? "повторить"}</p>)}
      </Panel>
      <Panel>
        <div className="panel-header"><h2>Recurring errors</h2><Badge>mistake tags</Badge></div>
        {detail.analytics.recurring_errors.map((item) => <p key={item.mistake_tag}>{item.mistake_tag}: {item.count}</p>)}
      </Panel>
      <Panel>
        <div className="panel-header"><h2>Weekly trends</h2><Badge>weekly</Badge></div>
        {detail.analytics.weekly_trends.map((week) => (
          <p key={week.week_start}>{week.week_start.slice(0, 10)}: {week.attempts} попыток, точность {week.accuracy_percent}%</p>
        ))}
      </Panel>
    </PlatformShell>
  );
}
