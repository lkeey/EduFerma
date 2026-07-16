import { UpdateImportRowRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ importId: string; rowId: string }> };

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { importId, rowId } = await routeContext.params;
    const input = await parseJson(request, UpdateImportRowRequestSchema);
    return ok(await getServices().teacher.updateImportRow(context, importId, rowId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
