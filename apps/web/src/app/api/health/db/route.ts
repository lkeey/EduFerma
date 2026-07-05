import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { checkDatabaseHealth } from "@/server/db/health";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    return ok(await checkDatabaseHealth());
  } catch (error) {
    return handleApiError(error);
  }
}
