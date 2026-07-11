import { LegacyReviewAttemptRequestSchema } from "@eduferma/validators";
import { created, handleApiError, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function POST(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const input = await parseJson(request, LegacyReviewAttemptRequestSchema);
    return created(
      await getServices().teacher.reviewAttempt(context, input.attemptId, { ...input, mistakeTags: input.mistakeTags ?? [] })
    );
  } catch (error) {
    return handleApiError(error);
  }
}
