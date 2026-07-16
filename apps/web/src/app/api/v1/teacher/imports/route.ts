import { CreateImportJobRequestSchema } from "@eduferma/validators";
import { created, handleApiError, ok, parseJson } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { getServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    return ok(await getServices().teacher.listImports(context));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiRole(roles.teacher, request);
    const input = await parseJson(request, CreateImportJobRequestSchema);
    return created(await getServices().teacher.createImport(context, input));
  } catch (error) {
    return handleApiError(error);
  }
}
