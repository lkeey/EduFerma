import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ studentId: string; adjustmentId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { studentId, adjustmentId } = await routeContext.params;
    return ok(await getServices().teacher.applyStudentPlanAdjustment(context, studentId, adjustmentId));
  } catch (error) {
    return handleApiError(error);
  }
}
