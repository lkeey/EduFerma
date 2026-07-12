import { openApiDocument } from "@/lib/platform/openapi";

export async function GET() {
  return Response.json(openApiDocument);
}
