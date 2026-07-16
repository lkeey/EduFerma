import { notFound } from "next/navigation";
import { Badge, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { PlanEditorClient } from "@/components/platform/plan-editor-client";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudentDetail } from "@/lib/platform/data";

export default async function TeacherStudentPlanPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireTeacherAccess();
  const { studentId } = await params;
  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) notFound();

  const currentPlan = detail.draftPlan;

  return (
    <PlatformShell role="teacher" title={`План: ${detail.student.displayName}`} subtitle={currentPlan.strategy}>
      <PlanEditorClient
        studentId={studentId}
        initialPlan={currentPlan}
        initialActiveVersion={detail.activePlan?.versionNo}
        initialAdjustments={detail.planAdjustments}
      />
      <Panel>
        <div className="panel-header"><h2>История версий</h2><Badge>{detail.planHistory.length}</Badge></div>
        {detail.planHistory.map((plan) => (
          <p key={plan?.id ?? "missing-plan"}>v{plan?.versionNo ?? 0}: {plan?.title ?? "—"} [{plan?.status ?? "missing"}]</p>
        ))}
      </Panel>
    </PlatformShell>
  );
}
