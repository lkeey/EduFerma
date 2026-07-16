import { PlatformShell } from "@/components/platform/app-shell";
import { ImportJobDetailClient } from "@/components/platform/import-job-detail-client";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherImport, getTeacherImportRows } from "@/lib/platform/data";

export default async function TeacherImportDetailPage({ params }: { params: Promise<{ importId: string }> }) {
  await requireTeacherAccess();
  const { importId } = await params;
  const [{ job }, { rows }] = await Promise.all([getTeacherImport(importId), getTeacherImportRows(importId)]);

  return (
    <PlatformShell role="teacher" title="Импорт задач" subtitle={`Задание ${job.id}`}>
      <ImportJobDetailClient initialJob={job} initialRows={rows} />
    </PlatformShell>
  );
}
