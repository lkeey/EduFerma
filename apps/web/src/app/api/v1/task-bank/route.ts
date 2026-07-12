import { TaskBankResponseSchema } from "@eduferma/api-client";
import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getPlatformTaskBank } from "@/lib/platform/dashboard";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.student, request);
    const payload = TaskBankResponseSchema.parse(await getPlatformTaskBank());
    return ok(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
