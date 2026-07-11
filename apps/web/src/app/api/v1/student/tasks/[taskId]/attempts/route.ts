import { SubmitAttemptRequestSchema } from "@eduferma/validators";
import { created, handleApiError, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.student, request);
    const { taskId } = await routeContext.params;
    const input = await parseJson(request, SubmitAttemptRequestSchema);
    return created(await getServices().student.submitAttempt(context, { ...input, taskId }));
  } catch (error) {
    return handleApiError(error);
  }
}
