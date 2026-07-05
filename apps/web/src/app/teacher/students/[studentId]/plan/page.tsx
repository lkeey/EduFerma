import { notFound } from "next/navigation";
import { Badge, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherStudentDetail } from "@/lib/platform/data";

export default async function TeacherStudentPlanPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireTeacherAccess();
  const { studentId } = await params;
  const detail = await getTeacherStudentDetail(studentId);
  if (!detail) notFound();

  return (
    <PlatformShell role="teacher" title={`План: ${detail.student.displayName}`} subtitle={detail.plan.strategy}>
      <Panel>
        <table className="data-table">
          <thead><tr><th>#</th><th>Дата</th><th>Тема</th><th>Прототипы</th><th>Teacher notes</th><th>Статус</th></tr></thead>
          <tbody>
            {detail.plan.lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{lesson.lessonNo}</td>
                <td>{lesson.plannedDate}</td>
                <td>{lesson.title}</td>
                <td>{lesson.prototypeIds.join(", ")}</td>
                <td>{lesson.teacherNotes}</td>
                <td><Badge>{lesson.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
