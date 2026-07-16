import { ProcessPublicationsRequestSchema } from "@eduferma/validators";
import { ApiError, handleApiError, ok, parseJson } from "@/server/api/responses";
import { processInternalPublications } from "@/server/publications/service";

async function parseCronBody(request: Request) {
  const text = await request.text();
  const payloadRequest = new Request(request.url, {
    method: request.method,
    headers: { "content-type": "application/json" },
    body: text.trim() ? text : "{}"
  });
  return parseJson(payloadRequest, ProcessPublicationsRequestSchema);
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new ApiError(503, "SETUP_REQUIRED", "CRON_SECRET is required for the internal publication processor");
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      throw new ApiError(401, "UNAUTHORIZED", "Authorization is required");
    }
    const input = await parseCronBody(request);
    return ok(await processInternalPublications({ ...input, workerId: "cron" }));
  } catch (error) {
    return handleApiError(error);
  }
}
