import { ReviewAttemptRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { attemptId } = await routeContext.params;
    const input = await parseJson(request, ReviewAttemptRequestSchema);
    return ok(await getServices().teacher.reviewAttempt(context, attemptId, { ...input, mistakeTags: input.mistakeTags ?? [] }));
  } catch (error) {
    return handleApiError(error);
  }
}
