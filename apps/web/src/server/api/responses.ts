import { ApiErrorSchema, type ErrorCode } from "@eduferma/validators";
import { SetupRequiredError, ServiceForbiddenError } from "@eduferma/core";
import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok(data: unknown) {
  return Response.json(data, { status: 200 });
}

export function created(data: unknown) {
  return Response.json(data, { status: 201 });
}

export function badRequest(code: ErrorCode, message: string, details?: unknown) {
  return errorResponse(400, code, message, details);
}

export function unauthorized() {
  return errorResponse(401, "UNAUTHORIZED", "Authentication is required");
}

export function forbidden() {
  return errorResponse(403, "FORBIDDEN", "You do not have access to this resource");
}

export function notFound(message = "Not found") {
  return errorResponse(404, "NOT_FOUND", message);
}

export function setupRequired(message = "Remote database is not configured") {
  return errorResponse(503, "SETUP_REQUIRED", message);
}

export function serverError() {
  return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
}

export function errorResponse(status: number, code: ErrorCode, message: string, details?: unknown) {
  const payload = ApiErrorSchema.parse({ error: { code, message, details } });
  return Response.json(payload, { status });
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid request", parsed.error.flatten());
  }

  return parsed.data;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.code, error.message, error.details);
  }

  if (error instanceof SetupRequiredError) {
    return setupRequired(error.message);
  }

  if (error instanceof ServiceForbiddenError) {
    return forbidden();
  }

  console.error(error);
  return serverError();
}
