import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.teacher, request);
    const { taskId } = await context.params;
    return ok(await getServices().teacher.getTask(taskId));
  } catch (error) {
    return handleApiError(error);
  }
}
