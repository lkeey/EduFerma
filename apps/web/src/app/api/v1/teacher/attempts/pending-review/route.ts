import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    return ok(await getServices().teacher.getPendingReviewAttempts());
  } catch (error) {
    return handleApiError(error);
  }
}
