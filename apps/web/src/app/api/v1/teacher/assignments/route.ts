import { CreateAssignmentRequestSchema } from "@eduferma/validators";
import { created, handleApiError, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function POST(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    await parseJson(request, CreateAssignmentRequestSchema);
    return created(await getServices().teacher.createAssignment());
  } catch (error) {
    return handleApiError(error);
  }
}
