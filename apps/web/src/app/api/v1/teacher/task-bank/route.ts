import { TeacherTaskBankQuerySchema } from "@eduferma/validators";
import { ApiError, handleApiError, ok } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const url = new URL(request.url);
    const parsed = TeacherTaskBankQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid task-bank query", parsed.error.flatten());
    }
    const query = parsed.data;
    return ok(await getServices().teacher.getTaskBank(context, query));
  } catch (error) {
    return handleApiError(error);
  }
}
