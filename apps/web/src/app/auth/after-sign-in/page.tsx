import { redirect } from "next/navigation";
import { getRoleRedirectPath } from "@/lib/platform/auth";

export const dynamic = "force-dynamic";

export default async function AfterSignInPage() {
  redirect(await getRoleRedirectPath());
}
