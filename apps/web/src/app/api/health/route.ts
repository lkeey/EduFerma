export async function GET() {
  return Response.json({
    ok: true,
    service: "eduferma-web",
    database: Boolean(process.env.DATABASE_URL),
    clerk: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)
  });
}
