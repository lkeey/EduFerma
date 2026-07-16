import { Badge, MetricCard, Panel, ProgressBar } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentProgress } from "@/lib/platform/data";

export default async function StudentProgressPage() {
  await requireStudentAccess("demo_student_oge");
  const progress = await getStudentProgress();

  return (
    <PlatformShell role="student" title="Прогресс" subtitle="Skill atoms, прототипы и последние попытки">
      <div className="metric-grid">
        <MetricCard label="Решено" value={String(progress.solved)} />
        <MetricCard label="Верных" value={String(progress.correct)} />
        <MetricCard label="Точность" value={`${progress.correctRate}%`} />
        <MetricCard label="Активных ДЗ" value={String(progress.activeAssignments)} />
      </div>
      <div className="metric-grid">
        <MetricCard label="Статус траектории" value={progress.analytics.forecast_status} detail={progress.analytics.forecast_reason} />
        <MetricCard label="План" value={`${progress.analytics.plan_completion.percent}%`} detail={`${progress.analytics.plan_completion.completed_lessons}/${progress.analytics.plan_completion.total_lessons} занятий`} />
        <MetricCard label="ДЗ" value={`${progress.analytics.homework_completion.percent}%`} detail={`просрочено ${progress.analytics.homework_completion.overdue_assignments}`} />
        <MetricCard label="Время" value={`${Math.round(progress.analytics.time_spent.total_seconds / 60)} мин`} detail={`в среднем ${Math.round(progress.analytics.time_spent.average_seconds_per_attempt / 60)} мин`} />
      </div>
      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header"><h2>Навыки</h2><Badge>skill_atoms</Badge></div>
          <div className="stack">
            {progress.skillMastery.map((item) => (
              <div key={item.skillAtom}>
                <div className="panel-header"><span>{item.skillAtom}</span><Badge>{Math.round(item.confidence * 100)}%</Badge></div>
                <ProgressBar value={Math.round(item.confidence * 100)} label={item.skillAtom} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="panel-header"><h2>Рекомендации</h2><Badge>rule-based</Badge></div>
          {progress.weakSkills.map((item) => <p key={item.skillAtom}>Повторить: {item.skillAtom}. {item.riskFlag}</p>)}
        </Panel>
        <Panel>
          <div className="panel-header"><h2>Еженедельный тренд</h2><Badge>analytics</Badge></div>
          {progress.analytics.weekly_trends.map((week) => (
            <p key={week.week_start}>
              {week.week_start.slice(0, 10)}: {week.attempts} попыток, точность {week.accuracy_percent}%, время {Math.round(week.time_spent_seconds / 60)} мин
            </p>
          ))}
        </Panel>
      </div>
    </PlatformShell>
  );
}
