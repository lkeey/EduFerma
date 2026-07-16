import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ importId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { importId } = await routeContext.params;
    return ok(await getServices().teacher.getImportRows(context, importId));
  } catch (error) {
    return handleApiError(error);
  }
}
