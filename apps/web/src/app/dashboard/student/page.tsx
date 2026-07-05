import { redirect } from "next/navigation";
import { requireStudentAccess } from "@/lib/platform/auth";

export const dynamic = "force-dynamic";

export default async function OldStudentDashboardPage() {
  await requireStudentAccess("demo_student_oge");
  redirect("/student/dashboard");
}
