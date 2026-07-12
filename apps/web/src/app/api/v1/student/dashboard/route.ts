import { StudentDashboardResponseSchema } from "@eduferma/api-client";
import { getStudentDashboardData } from "@/lib/platform/dashboard";
import { platformAccessDeniedResponse, requirePlatformPath } from "@/lib/platform/access";

export async function GET() {
  const access = await requirePlatformPath("/api/v1/student/dashboard");
  if (!access.ok) {
    return platformAccessDeniedResponse(access);
  }

  const payload = StudentDashboardResponseSchema.parse(await getStudentDashboardData());
  return Response.json(payload);
}
