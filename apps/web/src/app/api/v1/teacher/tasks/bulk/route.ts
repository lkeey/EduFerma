import { BulkTaskRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function POST(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const input = await parseJson(request, BulkTaskRequestSchema);
    return ok(await getServices().teacher.bulkTasks(context, input));
  } catch (error) {
    return handleApiError(error);
  }
}
