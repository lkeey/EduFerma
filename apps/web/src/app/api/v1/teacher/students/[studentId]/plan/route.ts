import { UpdatePlanRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { studentId } = await routeContext.params;
    return ok(await getServices().teacher.getStudentPlan(context, studentId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { studentId } = await routeContext.params;
    const input = await parseJson(request, UpdatePlanRequestSchema);
    return ok(await getServices().teacher.updateStudentPlan(context, studentId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
