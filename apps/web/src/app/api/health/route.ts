import { getAuthSetupStatus } from "@/server/auth/setup-status";

export async function GET() {
  const setup = getAuthSetupStatus();

  return Response.json({
    ok: true,
    service: "eduferma-web",
    version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    time: new Date().toISOString(),
    database: setup.database.configured,
    clerk: setup.clerk.configured,
    checks: {
      database: setup.database,
      clerk: {
        configured: setup.clerk.configured,
        missingEnv: setup.clerk.missingEnv
      },
      ownerBootstrap: {
        configured: setup.ownerEmailConfigured
      }
    }
  });
}
