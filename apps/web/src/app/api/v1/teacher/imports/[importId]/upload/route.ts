import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { validateImportUploadRequest } from "@/server/imports/upload-validation";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ importId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { importId } = await routeContext.params;
    validateImportUploadRequest(request);
    return ok(await getServices().teacher.uploadImport(context, importId, request));
  } catch (error) {
    return handleApiError(error);
  }
}
