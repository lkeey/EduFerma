import { UpdateOwnerUserAccessRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(["owner"], request);
    const { userId } = await routeContext.params;
    const input = await parseJson(request, UpdateOwnerUserAccessRequestSchema);
    return ok(await getServices().owner.updateUserAccess(context, userId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
