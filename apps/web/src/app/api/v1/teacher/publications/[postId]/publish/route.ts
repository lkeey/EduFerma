import { PublicationPublishRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { publishTeacherPublication } from "@/server/publications/service";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { postId } = await params;
    const body = await parseJson(request, PublicationPublishRequestSchema);
    return ok(await publishTeacherPublication(context, postId, body.targetIds));
  } catch (error) {
    return handleApiError(error);
  }
}
