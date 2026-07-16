import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ subjectId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(["owner"], request);
    const { subjectId } = await routeContext.params;
    return ok(await getServices().owner.getAccessRequest(context, subjectId));
  } catch (error) {
    return handleApiError(error);
  }
}
