export const DEFAULT_DB_SIZE_LIMIT_MB = 500;
export const BYTES_PER_MIB = 1024 * 1024;
export const DEFAULT_TASK_STORAGE_OVERHEAD_FACTOR = 2;

export type DbSizeEvaluation = {
  currentBytes: number;
  estimatedImportBytes: number;
  projectedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  withinLimit: boolean;
};

export function megabytesToBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("DB size limit must be a positive number of MB");
  }
  return Math.floor(value * BYTES_PER_MIB);
}

export function parsePgSizeToBytes(value: string | number | bigint): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const match = trimmed.match(/^([\d.]+)\s*([KMGT]?B|bytes?)$/i);
  if (!match) {
    throw new Error(`Cannot parse database size: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4
  };

  return Math.round(amount * (multipliers[unit] ?? 1));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
}

export function estimateJsonStorageBytes(value: unknown, overheadFactor = DEFAULT_TASK_STORAGE_OVERHEAD_FACTOR) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(value)).length;
  return Math.ceil(jsonBytes * overheadFactor);
}

export function evaluateDbSizeLimit(input: {
  currentBytes: number;
  limitBytes?: number;
  estimatedImportBytes?: number;
}): DbSizeEvaluation {
  const limitBytes = input.limitBytes ?? megabytesToBytes(DEFAULT_DB_SIZE_LIMIT_MB);
  const estimatedImportBytes = input.estimatedImportBytes ?? 0;
  const projectedBytes = input.currentBytes + estimatedImportBytes;
  const remainingBytes = limitBytes - projectedBytes;

  return {
    currentBytes: input.currentBytes,
    estimatedImportBytes,
    projectedBytes,
    limitBytes,
    remainingBytes,
    withinLimit: projectedBytes <= limitBytes
  };
}
