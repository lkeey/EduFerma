import { UpdatePublicationTargetRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole } from "@/server/auth/session";
import {
  archiveOwnerPublicationTarget,
  updateOwnerPublicationTarget
} from "@/server/publications/service";

const ownerRoles = ["owner"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ targetId: string }> }) {
  try {
    const context = await requireApiRole([...ownerRoles], request);
    const { targetId } = await params;
    const input = await parseJson(request, UpdatePublicationTargetRequestSchema);
    return ok(await updateOwnerPublicationTarget(context, targetId, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const context = await requireApiRole([...ownerRoles], request);
    const { targetId } = await params;
    return ok(await archiveOwnerPublicationTarget(context, targetId));
  } catch (error) {
    return handleApiError(error);
  }
}
