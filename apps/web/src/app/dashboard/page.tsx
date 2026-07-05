import { redirect } from "next/navigation";
import { getRoleRedirectPath } from "@/lib/platform/auth";

export default async function DashboardIndex() {
  redirect(await getRoleRedirectPath());
}
