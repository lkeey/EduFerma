import { UpdatePlanRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.teacher, request);
    const { studentId } = await context.params;
    return ok(await getServices().teacher.getStudentPlan(studentId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.teacher, request);
    const { studentId } = await context.params;
    await parseJson(request, UpdatePlanRequestSchema);
    return ok(await getServices().teacher.updateStudentPlan(studentId));
  } catch (error) {
    return handleApiError(error);
  }
}
