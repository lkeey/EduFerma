import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const response = NextResponse.redirect(new URL("/sign-in", `${protocol}://${host}`));
  response.cookies.delete("eduferma_demo_role");
  return response;
}
