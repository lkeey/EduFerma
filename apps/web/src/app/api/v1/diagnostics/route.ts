import { handleApiError } from "@/server/api/responses";
import { requireApiRole, roles } from "@/server/auth/session";
import { canViewExtendedDiagnostics, getDiagnosticsSnapshot } from "@/lib/platform/diagnostics";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store"
};

export async function GET(request: Request) {
  try {
    const context = await requireApiRole(roles.student, request);
    const access = {
      email: context.user.email,
      role: context.user.role
    };
    const snapshot = await getDiagnosticsSnapshot({
      access,
      includeExtended: canViewExtendedDiagnostics(access.role)
    });

    return Response.json(snapshot, {
      headers: noStoreHeaders
    });
  } catch (error) {
    return handleApiError(error);
  }
}
