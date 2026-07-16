import { describe, expect, it } from "vitest";
import {
  buildProductionSetupReport,
  normalizeProductionAppUrl,
  parseVerifyProductionSetupArgs,
  renderProductionSetupReport
} from "../../scripts/verify-production-setup";

describe("production setup verifier", () => {
  it("normalizes production app URLs to origins", () => {
    expect(normalizeProductionAppUrl("https://edu-ferma-web.vercel.app/api/health")).toBe(
      "https://edu-ferma-web.vercel.app"
    );
    expect(normalizeProductionAppUrl(undefined)).toBe("https://edu-ferma-web.vercel.app");
  });

  it("reports missing Clerk and owner env without secret values", () => {
    const report = buildProductionSetupReport({
      appUrl: "https://edu-ferma-web.vercel.app",
      health: {
        status: 200,
        ok: true,
        json: {
          ok: true,
          database: true,
          clerk: false,
          checks: {
            clerk: {
              configured: false,
              missingEnv: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]
            }
          },
          ownerBootstrap: { configured: false }
        }
      },
      openapi: { status: 200, ok: true, json: { openapi: "3.1.0" } },
      docs: { status: 200, ok: true, text: "SwaggerUIBundle" },
      telegramWebhook: {
        status: 503,
        ok: false,
        json: { error: { code: "SETUP_REQUIRED", message: "TELEGRAM_WEBHOOK_SECRET is required." } }
      }
    });

    expect(report.ok).toBe(false);
    expect(renderProductionSetupReport(report)).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY");
    expect(renderProductionSetupReport(report)).not.toContain("sk_");
  });

  it("treats Telegram webhook setup as optional unless requested", () => {
    const baseInput = {
      appUrl: "https://edu-ferma-web.vercel.app",
      health: {
        status: 200,
        ok: true,
        json: {
          ok: true,
          database: true,
          clerk: true,
          ownerBootstrap: { configured: true }
        }
      },
      openapi: { status: 200, ok: true, json: { openapi: "3.1.0" } },
      docs: { status: 200, ok: true, text: "SwaggerUIBundle" },
      telegramWebhook: {
        status: 503,
        ok: false,
        json: { error: { code: "SETUP_REQUIRED", message: "TELEGRAM_WEBHOOK_SECRET is required." } }
      }
    };

    expect(buildProductionSetupReport(baseInput).ok).toBe(true);
    expect(buildProductionSetupReport({ ...baseInput, requireTelegram: true }).ok).toBe(false);
  });

  it("requires publication integrations only when requested", () => {
    const baseInput = {
      appUrl: "https://edu-ferma-web.vercel.app",
      health: {
        status: 200,
        ok: true,
        json: {
          ok: true,
          database: true,
          clerk: true,
          checks: {
            ownerBootstrap: { configured: true }
          },
          integrations: {
            privateBlobConfigured: false,
            telegramPublisherConfigured: false,
            telegramOwnerChatConfigured: false,
            telegramAllowedChatsConfigured: false,
            publicationCronConfigured: false,
            vkConfigured: false
          }
        }
      },
      openapi: {
        status: 200,
        ok: true,
        json: { openapi: "3.1.0", paths: {} }
      },
      docs: { status: 200, ok: true, text: "SwaggerUIBundle" },
      telegramWebhook: { status: 401, ok: false, json: {} }
    };

    expect(buildProductionSetupReport(baseInput).ok).toBe(true);
    const required = buildProductionSetupReport({
      ...baseInput,
      requirePublications: true
    });
    expect(required.ok).toBe(false);
    expect(required.checks.filter((check) => check.status === "fail")).toHaveLength(5);
    expect(renderProductionSetupReport(required)).not.toMatch(
      /token_[a-z0-9]|postgres:\/\//i
    );
  });

  it("passes publication verification with safe readiness booleans and OpenAPI paths", () => {
    const paths = Object.fromEntries(
      [
        "/api/v1/teacher/publications",
        "/api/v1/teacher/publication-targets",
        "/api/v1/owner/publication-targets",
        "/api/v1/teacher/publication-providers/health",
        "/api/v1/internal/publications/process"
      ].map((path) => [path, {}])
    );
    const report = buildProductionSetupReport({
      appUrl: "https://edu-ferma-web.vercel.app",
      requirePublications: true,
      health: {
        status: 200,
        ok: true,
        json: {
          ok: true,
          database: true,
          clerk: true,
          checks: { ownerBootstrap: { configured: true } },
          integrations: {
            privateBlobConfigured: true,
            telegramPublisherConfigured: true,
            telegramOwnerChatConfigured: true,
            telegramAllowedChatsConfigured: true,
            publicationCronConfigured: true,
            vkConfigured: false
          }
        }
      },
      openapi: {
        status: 200,
        ok: true,
        json: { openapi: "3.1.0", paths }
      },
      docs: { status: 200, ok: true, text: "SwaggerUIBundle" },
      telegramWebhook: { status: 401, ok: false, json: {} }
    });

    expect(report.ok).toBe(true);
    expect(report.checks.find((check) => check.name === "VK provider")).toMatchObject({
      status: "warn",
      ok: true
    });
  });

  it("parses report-only, Telegram, and publication flags", () => {
    const args = parseVerifyProductionSetupArgs(
      [
        "--url",
        "https://example.com/path",
        "--report-only",
        "--require-telegram",
        "--require-publications"
      ],
      {}
    );

    expect(args).toEqual({
      appUrl: "https://example.com",
      reportOnly: true,
      requireTelegram: true,
      requirePublications: true
    });
  });
});
