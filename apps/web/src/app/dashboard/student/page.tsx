import { redirect } from "next/navigation";
import { requireStudentAccess } from "@/lib/platform/auth";

export const dynamic = "force-dynamic";

export default async function LegacyStudentDashboardPage() {
  await requireStudentAccess();
  redirect("/student/dashboard");
}
