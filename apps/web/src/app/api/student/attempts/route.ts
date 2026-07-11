import { LegacySubmitAttemptRequestSchema } from "@eduferma/validators";
import { created, handleApiError, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function POST(request: Request) {
  try {
    const context = await requireApiRole(roles.student, request);
    const input = await parseJson(request, LegacySubmitAttemptRequestSchema);
    return created(await getServices().student.submitAttempt(context, input));
  } catch (error) {
    return handleApiError(error);
  }
}
