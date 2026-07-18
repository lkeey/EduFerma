import { ProcessPublicationsRequestSchema } from "@eduferma/validators";
import { ApiError, handleApiError, ok, parseJson } from "@/server/api/responses";
import { processInternalPublications } from "@/server/publications/service";
import {
  getTelegramProductionAcceptanceStatus,
  recoverFailedTelegramProductionAcceptance,
  runTelegramProductionAcceptance
} from "@/server/publications/production-telegram-acceptance";

export const dynamic = "force-dynamic";

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

function requireCronAuthorization(request: Request) {
  if (!isAuthorized(request)) {
    throw new ApiError(401, "UNAUTHORIZED", "Authorization is required");
  }
}

export async function GET(request: Request) {
  try {
    requireCronAuthorization(request);
    const rawLimit = new URL(request.url).searchParams.get("limit");
    const input = ProcessPublicationsRequestSchema.parse({
      limit: rawLimit === null ? undefined : Number(rawLimit)
    });
    return ok(await processInternalPublications({ limit: input.limit, workerId: "cron:get" }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireCronAuthorization(request);
    const input = await parseCronBody(request);
    if (input.operation === "telegram_acceptance_status") {
      return ok(await getTelegramProductionAcceptanceStatus());
    }
    if (input.operation === "telegram_acceptance_recover_failed") {
      return ok(await recoverFailedTelegramProductionAcceptance());
    }
    if (input.operation === "telegram_acceptance") {
      return ok(await runTelegramProductionAcceptance());
    }
    return ok(await processInternalPublications({ limit: input.limit, workerId: "cron:post" }));
  } catch (error) {
    return handleApiError(error);
  }
}
