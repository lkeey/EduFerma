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

  it("parses report-only and require-telegram flags", () => {
    const args = parseVerifyProductionSetupArgs(
      ["--url", "https://example.com/path", "--report-only", "--require-telegram"],
      {}
    );

    expect(args).toEqual({
      appUrl: "https://example.com",
      reportOnly: true,
      requireTelegram: true
    });
  });
});
