import { UpdateAssignmentRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ assignmentId: string }> };

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { assignmentId } = await routeContext.params;
    const input = await parseJson(request, UpdateAssignmentRequestSchema);
    return ok(await getServices().teacher.updateAssignment(context, assignmentId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
