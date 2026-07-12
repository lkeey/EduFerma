import { TeacherDashboardResponseSchema } from "@eduferma/api-client";
import { getTeacherDashboardData } from "@/lib/platform/dashboard";
import { platformAccessDeniedResponse, requirePlatformPath } from "@/lib/platform/access";

export async function GET() {
  const access = await requirePlatformPath("/api/v1/teacher/dashboard");
  if (!access.ok) {
    return platformAccessDeniedResponse(access);
  }

  const payload = TeacherDashboardResponseSchema.parse(await getTeacherDashboardData());
  return Response.json(payload);
}
