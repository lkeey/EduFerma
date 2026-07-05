import { openApiDocument } from "@eduferma/api-contract";

export async function GET() {
  if (process.env.OPENAPI_DOCS_ENABLED === "false") {
    return Response.json({ error: { code: "NOT_FOUND", message: "OpenAPI docs are disabled" } }, { status: 404 });
  }

  return Response.json(openApiDocument, {
    headers: {
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
}
