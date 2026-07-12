import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveClerkEnv } from "@/lib/clerk-env";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/student(.*)",
  "/teacher(.*)",
  "/api/v1(.*)",
  "/api/health/db",
  "/api/student(.*)",
  "/api/teacher(.*)",
  "/api/platform(.*)"
]);
const clerkEnv = resolveClerkEnv();
const hasDemoAuth = process.env.ENABLE_DEMO_AUTH === "true" && process.env.VERCEL_ENV !== "production";

const protectedProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
}, {
  publishableKey: clerkEnv.publishableKey,
  secretKey: clerkEnv.secretKey
});

export default clerkEnv.configured && !hasDemoAuth ? protectedProxy : function openProxy() {
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
