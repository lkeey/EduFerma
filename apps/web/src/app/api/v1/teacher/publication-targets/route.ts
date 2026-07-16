import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { listTeacherPublicationTargets } from "@/server/publications/service";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    return ok(await listTeacherPublicationTargets());
  } catch (error) {
    return handleApiError(error);
  }
}
