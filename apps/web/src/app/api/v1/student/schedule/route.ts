import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.student, request);
    return ok(await getServices().student.getSchedule());
  } catch (error) {
    return handleApiError(error);
  }
}
