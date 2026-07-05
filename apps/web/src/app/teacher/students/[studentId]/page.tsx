import { notFound } from "next/navigation";
import { Badge, LinkButton, MetricCard, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudentDetail } from "@/lib/platform/data";

export default async function TeacherStudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireTeacherAccess();
  const { studentId } = await params;
  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) notFound();

  return (
    <PlatformShell role="teacher" title={detail.student.displayName} subtitle={detail.student.goalSummary}>
      <div className="metric-grid">
        <MetricCard label="Трек" value={detail.student.learningTrack} />
        <MetricCard label="Уровень" value={detail.student.currentLevel} />
        <MetricCard label="Попытки" value={String(detail.attempts.length)} />
        <MetricCard label="Риск" value={detail.student.riskLevel} />
      </div>
      <div className="dashboard-grid">
        <Panel>
          <div className="panel-header"><h2>Разделы ученика</h2><Badge>teacher-only</Badge></div>
          <div className="hero-actions">
            <LinkButton href={`/teacher/students/${studentId}/plan`} variant="secondary">План</LinkButton>
            <LinkButton href={`/teacher/students/${studentId}/schedule`} variant="secondary">Расписание</LinkButton>
            <LinkButton href={`/teacher/students/${studentId}/assignments`} variant="secondary">ДЗ</LinkButton>
            <LinkButton href={`/teacher/students/${studentId}/analytics`} variant="secondary">Аналитика</LinkButton>
          </div>
        </Panel>
        <Panel>
          <div className="panel-header"><h2>Последние попытки</h2><Badge>{detail.attempts.length}</Badge></div>
          {detail.attempts.map((attempt) => <p key={attempt.id}>{attempt.taskId}: {attempt.checkStatus}</p>)}
        </Panel>
      </div>
    </PlatformShell>
  );
}
