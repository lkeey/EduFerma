import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ assignmentId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.student, request);
    const { assignmentId } = await routeContext.params;
    return ok(await getServices().student.getAssignment(context, assignmentId));
  } catch (error) {
    return handleApiError(error);
  }
}
