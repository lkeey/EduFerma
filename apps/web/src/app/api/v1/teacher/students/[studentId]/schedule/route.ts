import { CreateScheduleEventRequestSchema } from "@eduferma/validators";
import { created, handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { studentId } = await routeContext.params;
    return ok(await getServices().teacher.getStudentSchedule(context, studentId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const { studentId } = await routeContext.params;
    const input = await parseJson(request, CreateScheduleEventRequestSchema);
    return created(
      await getServices().teacher.createStudentScheduleEvent(context, studentId, {
        ...input,
        durationMinutes: input.durationMinutes ?? 60
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}
