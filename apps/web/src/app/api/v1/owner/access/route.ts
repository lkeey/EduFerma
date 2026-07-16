import { OwnerAccessListQuerySchema } from "@eduferma/validators";
import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    const context = await requireApiRole(["owner"], request);
    const url = new URL(request.url);
    const filters = OwnerAccessListQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    return ok(await getServices().owner.listAccess(context, filters));
  } catch (error) {
    return handleApiError(error);
  }
}
