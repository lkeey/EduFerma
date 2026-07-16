import { CreatePublicationRequestSchema } from "@eduferma/validators";
import { created, handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { createTeacherPublication, listTeacherPublications } from "@/server/publications/service";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    return ok(await listTeacherPublications());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const input = await parseJson(request, CreatePublicationRequestSchema);
    return created(await createTeacherPublication(context, {
      ...input,
      publishAllowed: input.publishAllowed ?? false,
      targetIds: input.targetIds ?? []
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
