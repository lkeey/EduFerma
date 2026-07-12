import { platformAccessDeniedResponse, requirePlatformPath } from "@/lib/platform/access";
import {
  canViewExtendedDiagnostics,
  createDiagnosticsDeniedPayload,
  getDiagnosticsSnapshot
} from "@/lib/platform/diagnostics";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store"
};

export async function GET() {
  const access = await requirePlatformPath("/api/v1/diagnostics");
  if (!access.ok) {
    return platformAccessDeniedResponse(access);
  }

  if (access.access.role === "guest") {
    return Response.json(createDiagnosticsDeniedPayload(access.access.role), {
      status: 401,
      headers: noStoreHeaders
    });
  }

  const snapshot = await getDiagnosticsSnapshot({
    access: access.access,
    includeExtended: canViewExtendedDiagnostics(access.access.role)
  });

  return Response.json(snapshot, {
    headers: noStoreHeaders
  });
}
