type JsonRecord = Record<string, unknown>;

export type EndpointProbe = {
  status: number;
  ok: boolean;
  json?: unknown;
  text?: string;
  error?: string;
};

export type ProductionSetupReport = {
  appUrl: string;
  ok: boolean;
  checks: Array<{
    name: string;
    ok: boolean;
    status: "pass" | "fail" | "warn";
    detail: string;
    action?: string;
  }>;
};

type VerifyOptions = {
  appUrl: string;
  requireTelegram: boolean;
  requirePublications: boolean;
  reportOnly: boolean;
};

type ProductionSetupInput = {
  appUrl: string;
  requireTelegram?: boolean;
  requirePublications?: boolean;
  health: EndpointProbe;
  openapi: EndpointProbe;
  docs: EndpointProbe;
  telegramWebhook: EndpointProbe;
};

const defaultProductionUrl = "https://edu-ferma-web.vercel.app";
const publicationOpenApiPaths = [
  "/api/v1/teacher/publications",
  "/api/v1/teacher/publication-targets",
  "/api/v1/owner/publication-targets",
  "/api/v1/teacher/publication-providers/health",
  "/api/v1/internal/publications/process"
];

export function normalizeProductionAppUrl(value: string | undefined): string {
  const rawValue = value?.trim() || defaultProductionUrl;
  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`Invalid production URL: ${rawValue}`);
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Production URL must use https:// unless it points to localhost.");
  }

  return url.origin;
}

export function buildProductionSetupReport(input: ProductionSetupInput): ProductionSetupReport {
  const healthJson = asRecord(input.health.json);
  const healthChecks = asRecord(healthJson.checks);
  const clerkCheck = asRecord(healthChecks.clerk);
  const ownerBootstrapCheck = asRecord(healthJson.ownerBootstrap ?? healthChecks.ownerBootstrap);
  const integrationChecks = asRecord(healthJson.integrations ?? healthChecks.integrations);
  const openapiJson = asRecord(input.openapi.json);
  const openapiPaths = asRecord(openapiJson.paths);
  const telegramError = asRecord(input.telegramWebhook.json);
  const telegramErrorBody = asRecord(telegramError.error);
  const requirePublications = input.requirePublications === true;

  const checks: ProductionSetupReport["checks"] = [
    {
      name: "health endpoint",
      ok: input.health.ok && healthJson.ok === true,
      status: input.health.ok && healthJson.ok === true ? "pass" : "fail",
      detail: input.health.error || `HTTP ${input.health.status}`,
      action: input.health.ok ? undefined : "Check the latest Vercel production deployment and runtime logs."
    },
    {
      name: "remote database",
      ok: healthJson.database === true,
      status: healthJson.database === true ? "pass" : "fail",
      detail: healthJson.database === true ? "database:true" : "database is not reported as ready",
      action: healthJson.database === true ? undefined : "Set DATABASE_URL or a supported Neon/Postgres alias in Vercel."
    },
    {
      name: "Clerk auth",
      ok: healthJson.clerk === true,
      status: healthJson.clerk === true ? "pass" : "fail",
      detail:
        healthJson.clerk === true
          ? "clerk:true"
          : `missing ${formatMissingEnvNames(clerkCheck.missingEnv, ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"])}`,
      action:
        healthJson.clerk === true
          ? undefined
          : "Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in Vercel."
    },
    {
      name: "owner bootstrap",
      ok: ownerBootstrapCheck.configured === true,
      status: ownerBootstrapCheck.configured === true ? "pass" : "fail",
      detail: ownerBootstrapCheck.configured === true ? "OWNER_EMAIL configured" : "OWNER_EMAIL is not configured",
      action: ownerBootstrapCheck.configured === true ? undefined : "Set OWNER_EMAIL to the verified owner login email."
    },
    {
      name: "OpenAPI JSON",
      ok: input.openapi.ok && typeof openapiJson.openapi === "string",
      status: input.openapi.ok && typeof openapiJson.openapi === "string" ? "pass" : "fail",
      detail: input.openapi.error || `HTTP ${input.openapi.status}`,
      action: input.openapi.ok ? undefined : "Check OPENAPI_DOCS_ENABLED and /api/openapi.json deployment."
    },
    {
      name: "Swagger UI",
      ok: input.docs.ok && input.docs.text?.includes("SwaggerUIBundle") === true,
      status: input.docs.ok && input.docs.text?.includes("SwaggerUIBundle") === true ? "pass" : "fail",
      detail: input.docs.error || `HTTP ${input.docs.status}`,
      action: input.docs.ok ? undefined : "Check OPENAPI_DOCS_ENABLED and /api/docs deployment."
    },
    buildPublicationIntegrationCheck(
      "private Blob storage",
      integrationChecks.privateBlobConfigured === true,
      requirePublications,
      "BLOB_READ_WRITE_TOKEN is configured",
      "BLOB_READ_WRITE_TOKEN is not configured",
      "Provision a private Vercel Blob store and set BLOB_READ_WRITE_TOKEN."
    ),
    buildPublicationIntegrationCheck(
      "Telegram publisher",
      integrationChecks.telegramPublisherConfigured === true,
      requirePublications,
      "TELEGRAM_BOT_TOKEN configured",
      "TELEGRAM_BOT_TOKEN is not configured",
      "Set TELEGRAM_BOT_TOKEN for the allowlisted publishing bot."
    ),
    buildPublicationIntegrationCheck(
      "Telegram owner target",
      integrationChecks.telegramOwnerChatConfigured === true &&
        integrationChecks.telegramAllowedChatsConfigured === true,
      requirePublications,
      "owner chat and allowlist configured",
      "owner chat or allowlist is not configured",
      "Set TELEGRAM_OWNER_CHAT_ID and include it in TELEGRAM_ALLOWED_CHAT_IDS."
    ),
    buildPublicationIntegrationCheck(
      "publication processor secret",
      integrationChecks.publicationCronConfigured === true,
      requirePublications,
      "CRON_SECRET configured",
      "CRON_SECRET is not configured",
      "Set the same CRON_SECRET in Vercel and the selected cron runner."
    ),
    buildPublicationOpenApiCheck(openapiPaths, requirePublications),
    buildVkSetupCheck(integrationChecks.vkConfigured === true),
    buildTelegramWebhookCheck(input.telegramWebhook, telegramErrorBody, input.requireTelegram === true)
  ];

  return {
    appUrl: input.appUrl,
    ok: checks.every((check) => check.status !== "fail"),
    checks
  };
}

function buildPublicationIntegrationCheck(
  name: string,
  configured: boolean,
  required: boolean,
  configuredDetail: string,
  missingDetail: string,
  action: string
): ProductionSetupReport["checks"][number] {
  if (configured) {
    return {
      name,
      ok: true,
      status: "pass",
      detail: configuredDetail
    };
  }

  return {
    name,
    ok: !required,
    status: required ? "fail" : "warn",
    detail: missingDetail,
    action
  };
}

function buildPublicationOpenApiCheck(
  paths: JsonRecord,
  required: boolean
): ProductionSetupReport["checks"][number] {
  const missing = publicationOpenApiPaths.filter((path) => !(path in paths));
  if (missing.length === 0) {
    return {
      name: "publication OpenAPI group",
      ok: true,
      status: "pass",
      detail: `${publicationOpenApiPaths.length} required paths registered`
    };
  }

  return {
    name: "publication OpenAPI group",
    ok: !required,
    status: required ? "fail" : "warn",
    detail: `missing ${missing.join(", ")}`,
    action: "Deploy the publication API registry and rerun API governance."
  };
}

function buildVkSetupCheck(
  configured: boolean
): ProductionSetupReport["checks"][number] {
  return configured
    ? {
        name: "VK provider",
        ok: true,
        status: "pass",
        detail: "VK_ACCESS_TOKEN and VK_GROUP_ID configured"
      }
    : {
        name: "VK provider",
        ok: true,
        status: "warn",
        detail: "setup_required (accepted until live VK publishing is enabled)",
        action: "Set VK_ACCESS_TOKEN and VK_GROUP_ID before enabling live VK delivery."
      };
}

function buildTelegramWebhookCheck(
  probe: EndpointProbe,
  errorBody: JsonRecord,
  requireTelegram: boolean
): ProductionSetupReport["checks"][number] {
  if (probe.status === 401) {
    return {
      name: "Telegram webhook guard",
      ok: true,
      status: "pass",
      detail: "webhook secret is configured; unauthenticated probe was rejected"
    };
  }

  if (probe.status === 503 && errorBody.code === "SETUP_REQUIRED") {
    return {
      name: "Telegram webhook guard",
      ok: !requireTelegram,
      status: requireTelegram ? "fail" : "warn",
      detail: "TELEGRAM_WEBHOOK_SECRET is not configured",
      action: "Set TELEGRAM_WEBHOOK_SECRET before calling Telegram setWebhook."
    };
  }

  return {
    name: "Telegram webhook guard",
    ok: false,
    status: "fail",
    detail: probe.error || `unexpected HTTP ${probe.status}`,
    action: "Check /api/integrations/telegram/webhook runtime logs."
  };
}

export function renderProductionSetupReport(report: ProductionSetupReport): string {
  const lines = [`EduFerma production setup: ${report.appUrl}`, `status: ${report.ok ? "PASS" : "FAIL"}`, ""];

  for (const check of report.checks) {
    const marker = check.status.toUpperCase().padEnd(4, " ");
    lines.push(`[${marker}] ${check.name}: ${check.detail}`);
    if (check.action) lines.push(`       action: ${check.action}`);
  }

  return lines.join("\n");
}

export function parseVerifyProductionSetupArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): VerifyOptions {
  const urlArg = readFlagValue(argv, "--url") ?? env.NEXT_PUBLIC_APP_URL;

  return {
    appUrl: normalizeProductionAppUrl(urlArg),
    requireTelegram: argv.includes("--require-telegram"),
    requirePublications: argv.includes("--require-publications"),
    reportOnly: argv.includes("--report-only")
  };
}

async function main() {
  const options = parseVerifyProductionSetupArgs(process.argv.slice(2));
  const appUrl = options.appUrl;

  const [health, openapi, docs, telegramWebhook] = await Promise.all([
    probeEndpoint(new URL("/api/health", appUrl).toString(), { expectJson: true }),
    probeEndpoint(new URL("/api/openapi.json", appUrl).toString(), { expectJson: true }),
    probeEndpoint(new URL("/api/docs", appUrl).toString(), { expectText: true }),
    probeEndpoint(new URL("/api/integrations/telegram/webhook", appUrl).toString(), {
      method: "POST",
      expectJson: true
    })
  ]);

  const report = buildProductionSetupReport({
    appUrl,
    requireTelegram: options.requireTelegram,
    requirePublications: options.requirePublications,
    health,
    openapi,
    docs,
    telegramWebhook
  });

  console.log(renderProductionSetupReport(report));
  if (!options.reportOnly && !report.ok) process.exitCode = 1;
}

async function probeEndpoint(
  url: string,
  options: { method?: "GET" | "POST"; expectJson?: boolean; expectText?: boolean }
): Promise<EndpointProbe> {
  try {
    const response = await fetch(url, { method: options.method ?? "GET" });
    const text = await response.text();
    const probe: EndpointProbe = { status: response.status, ok: response.ok, text };

    if (options.expectJson) {
      try {
        probe.json = text ? JSON.parse(text) : undefined;
      } catch {
        probe.error = "response was not valid JSON";
      }
    }

    if (options.expectText && !text) {
      probe.error = "response body was empty";
    }

    return probe;
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : "request failed"
    };
  }
}

function readFlagValue(argv: string[], name: string) {
  const equalsArg = argv.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);

  const index = argv.indexOf(name);
  if (index >= 0) return argv[index + 1];
  return undefined;
}

function formatMissingEnvNames(value: unknown, fallback: string[]) {
  const names = Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
  return names.join(", ");
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Production setup verification failed.");
    process.exitCode = 1;
  });
}
