export async function GET() {
  return Response.json({
    ok: true,
    service: "eduferma-web",
    version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    time: new Date().toISOString(),
    database: Boolean(process.env.DATABASE_URL),
    clerk: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)
  });
}
