import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { ApiError } from "@/server/api/responses";

const LOCAL_BLOB_ROOT = resolve(tmpdir(), "eduferma-private-blob");

export type StoredPrivateImportBlob = {
  storageKey: string;
  byteSize: number;
  contentType: string;
};

export async function putPrivateImportBlob(input: {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
  sha256: string;
}): Promise<StoredPrivateImportBlob> {
  const safeFilename = sanitizeFilename(input.filename, input.contentType);
  const pathname = `task-imports/${input.sha256}/${safeFilename}`;

  if (hasBlobCredentials()) {
    const blob = await put(pathname, Buffer.from(input.bytes), {
      access: "private",
      allowOverwrite: true,
      contentType: input.contentType
    });
    return {
      storageKey: blob.pathname,
      byteSize: input.bytes.byteLength,
      contentType: input.contentType
    };
  }

  assertLocalFallbackAllowed();
  const storageKey = `local/${input.sha256}/${safeFilename}`;
  const path = resolveLocalPath(storageKey);
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, input.bytes);
  return {
    storageKey,
    byteSize: input.bytes.byteLength,
    contentType: input.contentType
  };
}

export async function getPrivateImportBlob(storageKey: string, maxBytes: number) {
  if (storageKey.startsWith("local/")) {
    assertLocalFallbackAllowed();
    const bytes = new Uint8Array(await readFile(resolveLocalPath(storageKey)));
    assertBlobSize(bytes.byteLength, maxBytes);
    return bytes;
  }

  if (!hasBlobCredentials()) {
    throw new ApiError(503, "SETUP_REQUIRED", "Private Vercel Blob storage is not configured");
  }

  const result = await get(storageKey, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) {
    throw new ApiError(404, "NOT_FOUND", "Import source blob was not found");
  }
  assertBlobSize(result.blob.size, maxBytes);
  return readStreamWithLimit(result.stream, maxBytes);
}

function hasBlobCredentials() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID));
}

function assertLocalFallbackAllowed() {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new ApiError(503, "SETUP_REQUIRED", "Private Vercel Blob storage is required in production");
  }
}

function resolveLocalPath(storageKey: string) {
  if (!/^local\/[a-f0-9]{64}\/[a-zA-Z0-9._-]+$/.test(storageKey)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid local import storage key");
  }
  const path = resolve(LOCAL_BLOB_ROOT, storageKey);
  if (!path.startsWith(`${LOCAL_BLOB_ROOT}/`)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid local import storage path");
  }
  return path;
}

function sanitizeFilename(filename: string, contentType: string) {
  const original = basename(filename).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  if (original && original !== "." && original !== "..") return original;
  return `source${extensionForContentType(contentType)}`;
}

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "text/csv":
      return ".csv";
    case "application/json":
      return ".json";
    case "application/x-ndjson":
      return ".jsonl";
    case "text/html":
      return ".html";
    case "application/pdf":
      return ".pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    default:
      return ".bin";
  }
}

async function readStreamWithLimit(stream: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      assertBlobSize(total, maxBytes);
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function assertBlobSize(size: number, maxBytes: number) {
  if (size > maxBytes) {
    throw new ApiError(400, "VALIDATION_ERROR", "Import source exceeded the maximum size");
  }
}
