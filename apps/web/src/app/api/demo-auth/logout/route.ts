import { NextRequest, NextResponse } from "next/server";
import { DEMO_ROLE_COOKIE } from "@/lib/demo-auth";

export async function GET(request: NextRequest) {
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const response = NextResponse.redirect(new URL("/sign-in", `${protocol}://${host}`));
  response.cookies.delete(DEMO_ROLE_COOKIE);
  return response;
}
