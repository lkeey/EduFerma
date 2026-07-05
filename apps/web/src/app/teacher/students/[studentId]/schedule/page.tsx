import { notFound } from "next/navigation";
import { Badge, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudentDetail } from "@/lib/platform/data";

export default async function TeacherStudentSchedulePage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireTeacherAccess();
  const { studentId } = await params;
  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) notFound();

  return (
    <PlatformShell role="teacher" title={`Расписание: ${detail.student.displayName}`} subtitle="MVP actions: create, edit, cancel/move, link assignment">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Дата</th><th>Занятие</th><th>Статус</th><th>ДЗ</th></tr></thead>
          <tbody>
            {detail.schedule.map((event) => (
              <tr key={event.id}><td>{event.startsAt}</td><td>{event.title}</td><td><Badge>{event.status}</Badge></td><td>{event.assignmentId ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
