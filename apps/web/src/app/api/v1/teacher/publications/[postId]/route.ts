import { UpdatePublicationRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getTeacherPublication, updateTeacherPublication } from "@/server/publications/service";

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    await requireApiRole(roles.teacher, request);
    const { postId } = await params;
    return ok(await getTeacherPublication(postId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { postId } = await params;
    const input = await parseJson(request, UpdatePublicationRequestSchema);
    return ok(await updateTeacherPublication(context, postId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
