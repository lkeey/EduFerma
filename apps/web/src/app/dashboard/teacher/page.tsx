import { redirect } from "next/navigation";
import { requireTeacherAccess } from "@/lib/platform/auth";

export const dynamic = "force-dynamic";

export default async function LegacyTeacherDashboardPage() {
  await requireTeacherAccess();
  redirect("/teacher/dashboard");
}
