import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    const context = await requireApiRole(roles.authenticated, request);
    return ok(await getServices().common.getMe(context));
  } catch (error) {
    return handleApiError(error);
  }
}
