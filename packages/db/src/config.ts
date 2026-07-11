type DatabaseEnv = Record<string, string | undefined>;

export type DatabaseRuntime = "production" | "preview" | "development" | "test";

export type RuntimeDatabaseConfig = {
  databaseUrl: string;
  directDatabaseUrl?: string;
  runtime: DatabaseRuntime;
  isRemote: boolean;
};

type ResolvedEnvValue = {
  label: string;
  value: string;
};

export class DatabaseSetupRequiredError extends Error {
  readonly code = "SETUP_REQUIRED";

  constructor(message = "DATABASE_URL is required before using the remote database") {
    super(message);
    this.name = "DatabaseSetupRequiredError";
  }
}

export class UnsafeDatabaseUrlError extends Error {
  readonly code = "UNSAFE_DATABASE_URL";

  constructor(message: string) {
    super(message);
    this.name = "UnsafeDatabaseUrlError";
  }
}

const postgresProtocols = new Set(["postgres:", "postgresql:"]);
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const runtimeDatabaseUrlKeys = ["DATABASE_URL", "POSTGRES_URL"];
const directDatabaseUrlKeys = ["DIRECT_DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL"];

export function getRuntimeDatabaseConfig(env: DatabaseEnv = process.env): RuntimeDatabaseConfig {
  const runtimeUrl = resolveRuntimeDatabaseUrl(env);
  const directUrl = resolveDirectDatabaseUrl(env);
  const databaseUrl = readUrl(runtimeUrl?.value, runtimeUrl?.label ?? "DATABASE_URL");
  const directDatabaseUrl = readOptionalUrl(directUrl?.value, directUrl?.label ?? "DIRECT_DATABASE_URL");

  assertSafeForEnvironment(databaseUrl, "DATABASE_URL", env);
  if (directDatabaseUrl) {
    assertSafeForEnvironment(directDatabaseUrl, "DIRECT_DATABASE_URL", env);
  }

  return {
    databaseUrl,
    directDatabaseUrl,
    runtime: resolveDatabaseRuntime(env),
    isRemote: !isLocalDatabaseUrl(databaseUrl)
  };
}

export function hasRuntimeDatabaseEnv(env: DatabaseEnv = process.env): boolean {
  return Boolean(resolveRuntimeDatabaseUrl(env)?.value.trim());
}

export function getMigrationDatabaseUrl(
  env: DatabaseEnv = process.env,
  options: { required?: boolean } = {}
): string | undefined {
  const resolvedUrl = resolveMigrationDatabaseUrl(env);
  if (!resolvedUrl) {
    if (options.required) {
      throw new DatabaseSetupRequiredError("DIRECT_DATABASE_URL or DATABASE_URL is required for this database command");
    }
    return undefined;
  }

  assertPostgresUrl(resolvedUrl.value, resolvedUrl.label);
  assertSafeForEnvironment(resolvedUrl.value, resolvedUrl.label, env);
  return resolvedUrl.value;
}

export function assertProductionSeedAllowed(env: DatabaseEnv = process.env, argv: string[] = process.argv) {
  getRuntimeDatabaseConfig(env);

  if (!isProductionDatabaseEnvironment(env)) return;

  const envAllowed = env.EDUFERMA_ALLOW_PRODUCTION_SEED === "true";
  const flagAllowed = argv.includes("--allow-production-seed");
  if (!envAllowed || !flagAllowed) {
    throw new UnsafeDatabaseUrlError(
      "Production seed apply is disabled. Set EDUFERMA_ALLOW_PRODUCTION_SEED=true and pass --allow-production-seed only after backup and migration review."
    );
  }
}

export function assertImportApplyAllowed(env: DatabaseEnv = process.env) {
  getRuntimeDatabaseConfig(env);

  if (isProductionDatabaseEnvironment(env) && env.EDUFERMA_ALLOW_IMPORT_APPLY !== "true") {
    throw new UnsafeDatabaseUrlError(
      "Production import apply is disabled. Set EDUFERMA_ALLOW_IMPORT_APPLY=true only after source, backup, and mapping review."
    );
  }
}

export function isProductionDatabaseEnvironment(env: DatabaseEnv = process.env) {
  if (env.VERCEL_ENV === "production" || env.EDUFERMA_DB_ENV === "production") return true;
  if (env.VERCEL_ENV === "preview" || env.EDUFERMA_DB_ENV === "development") return false;
  return env.NODE_ENV === "production";
}

export function resolveDatabaseRuntime(env: DatabaseEnv = process.env): DatabaseRuntime {
  if (env.VERCEL_ENV === "production" || env.EDUFERMA_DB_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  if (env.NODE_ENV === "test" || env.EDUFERMA_DB_ENV === "test") return "test";
  return "development";
}

export function isLocalDatabaseUrl(url: string) {
  const hostname = parseUrl(url, "DATABASE_URL").hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return localHosts.has(hostname) || hostname.endsWith(".localhost");
}

function readUrl(value: string | undefined, label: string) {
  const url = value?.trim();
  if (!url) throw new DatabaseSetupRequiredError(`${label} is required before using the remote database`);
  assertPostgresUrl(url, label);
  return url;
}

function readOptionalUrl(value: string | undefined, label: string) {
  const url = value?.trim();
  if (!url) return undefined;
  assertPostgresUrl(url, label);
  return url;
}

function resolveRuntimeDatabaseUrl(env: DatabaseEnv): ResolvedEnvValue | undefined {
  return readFirstEnv(env, runtimeDatabaseUrlKeys) ?? readFirstSuffixedEnv(env, runtimeDatabaseUrlKeys, { excludeDirectUrls: true });
}

function resolveDirectDatabaseUrl(env: DatabaseEnv): ResolvedEnvValue | undefined {
  return readFirstEnv(env, directDatabaseUrlKeys) ?? readFirstSuffixedEnv(env, directDatabaseUrlKeys);
}

function resolveMigrationDatabaseUrl(env: DatabaseEnv): ResolvedEnvValue | undefined {
  return resolveDirectDatabaseUrl(env) ?? resolveRuntimeDatabaseUrl(env);
}

function readFirstEnv(env: DatabaseEnv, keys: string[]): ResolvedEnvValue | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return { label: key, value };
  }

  return undefined;
}

function readFirstSuffixedEnv(
  env: DatabaseEnv,
  suffixes: string[],
  options: { excludeDirectUrls?: boolean } = {}
): ResolvedEnvValue | undefined {
  const suffixPriorities = new Map(suffixes.map((suffix, index) => [suffix, index]));
  const candidates: Array<ResolvedEnvValue & { priority: number }> = [];

  for (const [key, rawValue] of Object.entries(env)) {
    const value = rawValue?.trim();
    if (!value || key.startsWith("NEXT_PUBLIC_")) continue;

    const normalizedKey = key.toUpperCase();
    if (options.excludeDirectUrls && isDirectDatabaseUrlKey(normalizedKey)) continue;

    for (const suffix of suffixes) {
      if (normalizedKey === suffix || !normalizedKey.endsWith(`_${suffix}`)) continue;
      candidates.push({ label: key, value, priority: suffixPriorities.get(suffix) ?? suffixes.length });
      break;
    }
  }

  candidates.sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label));
  return candidates[0] ? { label: candidates[0].label, value: candidates[0].value } : undefined;
}

function isDirectDatabaseUrlKey(normalizedKey: string) {
  return directDatabaseUrlKeys.some((key) => normalizedKey === key || normalizedKey.endsWith(`_${key}`));
}

function assertPostgresUrl(url: string, label: string) {
  const parsed = parseUrl(url, label);
  if (!postgresProtocols.has(parsed.protocol)) {
    throw new UnsafeDatabaseUrlError(`${label} must be a postgres:// or postgresql:// URL`);
  }
}

function assertSafeForEnvironment(url: string, label: string, env: DatabaseEnv) {
  if (isProductionDatabaseEnvironment(env) && isLocalDatabaseUrl(url)) {
    throw new UnsafeDatabaseUrlError(`${label} must not point to a local database in production`);
  }
}

function parseUrl(url: string, label: string) {
  try {
    return new URL(url);
  } catch {
    throw new UnsafeDatabaseUrlError(`${label} must be a valid URL`);
  }
}
