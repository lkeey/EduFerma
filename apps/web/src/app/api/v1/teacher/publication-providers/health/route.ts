import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getPublicationProviderHealth } from "@/server/publications/service";

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    return ok(await getPublicationProviderHealth());
  } catch (error) {
    return handleApiError(error);
  }
}
