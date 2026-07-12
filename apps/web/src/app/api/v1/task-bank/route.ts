import { TaskBankResponseSchema } from "@eduferma/api-client";
import { getPlatformTaskBank } from "@/lib/platform/dashboard";
import { platformAccessDeniedResponse, requirePlatformPath } from "@/lib/platform/access";

export async function GET() {
  const access = await requirePlatformPath("/api/v1/task-bank");
  if (!access.ok) {
    return platformAccessDeniedResponse(access);
  }

  const payload = TaskBankResponseSchema.parse(await getPlatformTaskBank());
  return Response.json(payload);
}
