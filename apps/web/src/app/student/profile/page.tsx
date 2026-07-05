import { MetricCard, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getDemoStudent } from "@/lib/platform/data";

export default async function StudentProfilePage() {
  await requireStudentAccess("demo_student_oge");
  const student = getDemoStudent();

  return (
    <PlatformShell role="student" title="Профиль" subtitle="Учебные цели и текущий трек">
      <div className="metric-grid">
        <MetricCard label="Имя" value={student.displayName} />
        <MetricCard label="Трек" value={student.learningTrack} />
        <MetricCard label="Цель" value={student.targetGrade ?? student.targetScore?.toString() ?? "—"} />
        <MetricCard label="Риск" value={student.riskLevel} />
      </div>
      <Panel><p>{student.goalSummary}</p></Panel>
    </PlatformShell>
  );
}
