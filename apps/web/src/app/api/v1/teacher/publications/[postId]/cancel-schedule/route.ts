import { handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { cancelTeacherPublicationSchedule } from "@/server/publications/service";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { postId } = await params;
    return ok(await cancelTeacherPublicationSchedule(context, postId));
  } catch (error) {
    return handleApiError(error);
  }
}
