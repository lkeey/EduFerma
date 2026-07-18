import { NextRequest, NextResponse } from "next/server";
import { isDemoAuthEnabled } from "@/lib/platform/auth";
import {
  DEMO_ROLE_COOKIE,
  getDemoAuthRedirectPath,
  parseDemoAuthRole
} from "@/lib/demo-auth";

export async function GET(request: NextRequest) {
  if (!isDemoAuthEnabled()) {
    return Response.json({ error: "Demo auth is disabled" }, { status: 403 });
  }

  const role = parseDemoAuthRole(request.nextUrl.searchParams.get("role"));
  if (!role) {
    return Response.json({ error: "Unsupported demo role" }, { status: 400 });
  }

  const redirectTo = getDemoAuthRedirectPath(role);
  const response = NextResponse.redirect(getSameHostUrl(request, redirectTo));
  response.cookies.set(DEMO_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}

function getSameHostUrl(request: NextRequest, pathname: string) {
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("host") ?? request.nextUrl.host;
  return new URL(pathname, `${protocol}://${host}`);
}
