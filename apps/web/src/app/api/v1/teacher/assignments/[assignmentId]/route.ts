import { UpdateAssignmentRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ assignmentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.teacher, request);
    const { assignmentId } = await context.params;
    await parseJson(request, UpdateAssignmentRequestSchema);
    return ok(await getServices().teacher.updateAssignment(assignmentId));
  } catch (error) {
    return handleApiError(error);
  }
}
