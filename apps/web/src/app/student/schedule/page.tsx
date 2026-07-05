import { Badge, Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { requireStudentAccess } from "@/lib/platform/auth";
import { getStudentSchedule } from "@/lib/platform/data";

export default async function StudentSchedulePage() {
  await requireStudentAccess("demo_student_oge");
  const events = await getStudentSchedule();

  return (
    <PlatformShell role="student" title="Расписание" subtitle="Ближайшие и прошедшие занятия">
      <Panel>
        <table className="data-table">
          <thead><tr><th>Дата</th><th>Занятие</th><th>Статус</th><th>Ссылка</th></tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.startsAt}</td>
                <td>{event.title}</td>
                <td><Badge>{event.status}</Badge></td>
                <td>{event.meetingUrl ? <a href={event.meetingUrl}>Открыть</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PlatformShell>
  );
}
