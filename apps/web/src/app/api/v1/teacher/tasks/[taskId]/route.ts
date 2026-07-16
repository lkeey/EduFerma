import { DeleteTaskRequestSchema, TeacherTaskPatchRequestSchema } from "@eduferma/validators";
import { handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { taskId } = await routeContext.params;
    return ok(await getServices().teacher.getTask(context, taskId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { taskId } = await routeContext.params;
    const input = await parseJson(request, TeacherTaskPatchRequestSchema);
    return ok(await getServices().teacher.updateTask(context, taskId, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { taskId } = await routeContext.params;
    const input = (request.headers.get("content-type")?.includes("application/json")
      ? await parseJson(request, DeleteTaskRequestSchema)
      : DeleteTaskRequestSchema.parse({ mode: new URL(request.url).searchParams.get("mode") ?? undefined })) ?? { mode: "delete" };
    return ok(await getServices().teacher.deleteTask(context, taskId, input.mode));
  } catch (error) {
    return handleApiError(error);
  }
}
