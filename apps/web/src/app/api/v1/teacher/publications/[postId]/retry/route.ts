import { PublicationRetryRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { retryTeacherPublication } from "@/server/publications/service";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { postId } = await params;
    const body = await parseJson(request, PublicationRetryRequestSchema);
    return ok(await retryTeacherPublication(context, postId, body));
  } catch (error) {
    return handleApiError(error);
  }
}
