import { PlatformShell } from "@/components/platform/app-shell";
import { ImportJobsClient } from "@/components/platform/import-jobs-client";
import { requireTeacherAccess } from "@/lib/platform/auth";
import { getTeacherImports } from "@/lib/platform/data";

export default async function TeacherImportsPage() {
  await requireTeacherAccess();
  const { jobs } = await getTeacherImports();

  return (
    <PlatformShell role="teacher" title="Импорт задач" subtitle="Создание заданий импорта, анализ без записи в банк и явное применение">
      <ImportJobsClient initialJobs={jobs} />
    </PlatformShell>
  );
}
