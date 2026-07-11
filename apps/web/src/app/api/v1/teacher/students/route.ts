import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    return ok(await getServices().teacher.getStudents(context));
  } catch (error) {
    return handleApiError(error);
  }
}
