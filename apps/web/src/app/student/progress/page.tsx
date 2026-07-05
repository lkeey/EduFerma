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
      </div>
    </PlatformShell>
  );
}
