import { ReviewAttemptRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.teacher, request);
    const { attemptId } = await context.params;
    await parseJson(request, ReviewAttemptRequestSchema);
    return ok(await getServices().teacher.reviewAttempt(attemptId));
  } catch (error) {
    return handleApiError(error);
  }
}
