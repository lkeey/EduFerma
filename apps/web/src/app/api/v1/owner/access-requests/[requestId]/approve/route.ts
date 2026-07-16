import { ApproveAccessRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(["owner"], request);
    const { requestId } = await routeContext.params;
    const input = await parseJson(request, ApproveAccessRequestSchema);
    return ok(await getServices().owner.approveAccessRequest(context, requestId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
