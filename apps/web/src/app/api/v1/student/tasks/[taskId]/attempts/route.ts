import { SubmitAttemptRequestSchema } from "@eduferma/validators";
import { created, handleApiError, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireApiRole(roles.student, request);
    const { taskId } = await context.params;
    const input = await parseJson(request, SubmitAttemptRequestSchema);
    return created(await getServices().student.submitAttempt({ taskId, answer: input.answer }));
  } catch (error) {
    return handleApiError(error);
  }
}
