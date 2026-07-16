import { AnalyzeImportJobRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ importId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { importId } = await routeContext.params;
    const input = await parseJson(request, AnalyzeImportJobRequestSchema);
    return ok(await getServices().teacher.analyzeImport(context, importId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
