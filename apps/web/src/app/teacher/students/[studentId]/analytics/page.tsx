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
        <MetricCard label="Решено" value={String(detail.mastery.solved)} />
        <MetricCard label="Точность" value={`${detail.mastery.correctRate}%`} />
        <MetricCard label="Pending review" value={String(detail.attempts.filter((item) => item.checkStatus === "pending_review").length)} />
        <MetricCard label="Слабых навыков" value={String(detail.mastery.weakSkills.length)} />
      </div>
      <Panel>
        <div className="panel-header"><h2>Weak areas</h2><Badge>skill_atoms</Badge></div>
        {detail.mastery.weakSkills.map((skill) => <p key={skill.skillAtom}>{skill.skillAtom}: {skill.riskFlag ?? "повторить"}</p>)}
      </Panel>
    </PlatformShell>
  );
}
