import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ assignmentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.student, request);
    const { assignmentId } = await context.params;
    return ok(await getServices().student.getAssignment(assignmentId));
  } catch (error) {
    return handleApiError(error);
  }
}
