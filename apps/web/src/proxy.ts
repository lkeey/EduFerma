import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { applyResolvedClerkEnvToProcessEnv, resolveClerkEnv } from "@/lib/clerk-env";

const clerkEnv = resolveClerkEnv();
applyResolvedClerkEnvToProcessEnv(clerkEnv);
const hasDemoAuth = process.env.ENABLE_DEMO_AUTH === "true" && process.env.VERCEL_ENV !== "production";

const clerkProxy = clerkMiddleware();

export default clerkEnv.configured && !hasDemoAuth ? clerkProxy : function openProxy() {
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
