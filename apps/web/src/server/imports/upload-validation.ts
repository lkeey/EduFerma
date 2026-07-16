import { ApiError } from "@/server/api/responses";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const supportedUploadTypes = [
  "multipart/form-data",
  "application/octet-stream",
  "application/json",
  "application/x-ndjson",
  "text/csv",
  "text/html",
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export function validateImportUploadRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!supportedUploadTypes.some((allowed) => contentType.startsWith(allowed))) {
    throw new ApiError(400, "VALIDATION_ERROR", "Unsupported upload content type");
  }
  if (!contentType.startsWith("multipart/form-data") && !request.headers.get("x-upload-filename")) {
    throw new ApiError(400, "VALIDATION_ERROR", "Raw uploads require the x-upload-filename header");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, "VALIDATION_ERROR", "Upload exceeded the maximum size");
  }
}
