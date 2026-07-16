import { CreatePublicationTargetRequestSchema } from "@eduferma/validators";
import { created, handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole } from "@/server/auth/session";
import { createOwnerPublicationTarget, listOwnerPublicationTargets } from "@/server/publications/service";

const ownerRoles = ["owner"] as const;

export async function GET(request: Request) {
  try {
    await requireApiRole([...ownerRoles], request);
    return ok(await listOwnerPublicationTargets());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiRole([...ownerRoles], request);
    const input = await parseJson(request, CreatePublicationTargetRequestSchema);
    return created(await createOwnerPublicationTarget(context, {
      ...input,
      status: input.status ?? "active",
      config: input.config ?? {}
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
