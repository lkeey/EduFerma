import { NextRequest, NextResponse } from "next/server";
import { isDemoAuthEnabled } from "@/lib/platform/auth";

export async function GET(request: NextRequest) {
  if (!isDemoAuthEnabled()) {
    return Response.json({ error: "Demo auth is disabled" }, { status: 403 });
  }

  const role = request.nextUrl.searchParams.get("role") === "teacher" ? "teacher" : "student";
  const redirectTo = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
  const response = NextResponse.redirect(getSameHostUrl(request, redirectTo));
  response.cookies.set("eduferma_demo_role", role, {
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
