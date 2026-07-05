import { CreateScheduleEventRequestSchema } from "@eduferma/validators";
import { created, handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(request: Request) {
  try {
    await requireApiRole(roles.teacher, request);
    return ok(await getServices().teacher.getStudentSchedule());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, _context: RouteContext) {
  try {
    await requireApiRole(roles.teacher, request);
    await parseJson(request, CreateScheduleEventRequestSchema);
    return created(await getServices().teacher.createStudentScheduleEvent());
  } catch (error) {
    return handleApiError(error);
  }
}
