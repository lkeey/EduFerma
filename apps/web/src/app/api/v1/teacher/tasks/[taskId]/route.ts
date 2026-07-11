import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { taskId } = await routeContext.params;
    return ok(await getServices().teacher.getTask(context, taskId));
  } catch (error) {
    return handleApiError(error);
  }
}
