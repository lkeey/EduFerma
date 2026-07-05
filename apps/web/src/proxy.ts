import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
const hasClerkEnv = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const hasDemoAuth = process.env.ENABLE_DEMO_AUTH === "true" && process.env.VERCEL_ENV !== "production";

const protectedProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default hasClerkEnv && !hasDemoAuth ? protectedProxy : function openProxy() {
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
