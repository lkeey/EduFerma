import { describe, expect, it } from "vitest";
import {
  ProcessPublicationsRequestSchema,
  type PublicationDetail
} from "@eduferma/validators";
import {
  assertCompletedAcceptance,
  assertRecoverableAcceptance,
  checkTelegramPrivateChatAccess,
  getTelegramBotIdentity,
  readAcceptanceConfig,
  summarizeAcceptanceDetail
} from "../../apps/web/src/server/publications/production-telegram-acceptance";

const productionEnv = {
  VERCEL_ENV: "production",
  ENABLE_DEMO_AUTH: "false",
};

function publication(
  overrides: Partial<PublicationDetail> = {}
): PublicationDetail {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    duplicateOfPostId: null,
    revision: 1,
    title: "Acceptance",
    excerpt: null,
    bodyMd: "Private acceptance",
    audience: "owner",
    contentHash: null,
    status: "published",
    scheduledFor: null,
    publishedAt: new Date().toISOString(),
    publishAllowed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targets: [],
    metadata: {},
    deliveries: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        provider: "telegram",
        status: "sent",
        attemptNo: 1,
        idempotencyKey: "acceptance-key",
        providerMessageId: "42",
        claimedAt: new Date().toISOString(),
        claimedBy: "acceptance",
        deliveredAt: new Date().toISOString(),
        nextAttemptAt: null,
        errorCode: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    history: [],
    ...overrides
  };
}

describe("Telegram production acceptance safety", () => {
  it("requires the owner chat to be allowlisted", () => {
    expect(() =>
      readAcceptanceConfig({
        ...productionEnv,
        TELEGRAM_BOT_TOKEN: "configured",
        TELEGRAM_OWNER_CHAT_ID: "1001",
        TELEGRAM_ALLOWED_CHAT_IDS: "1002"
      })
    ).toThrow(/must be present/);
  });

  it("accepts an allowlisted private owner configuration", () => {
    expect(
      readAcceptanceConfig({
        ...productionEnv,
        TELEGRAM_BOT_TOKEN: "configured",
        TELEGRAM_OWNER_CHAT_ID: "1001",
        TELEGRAM_ALLOWED_CHAT_IDS: "1002,1001"
      })
    ).toEqual({
      botToken: "configured",
      ownerChatId: "1001"
    });
  });

  it("rejects group and channel chat IDs for the private acceptance send", () => {
    expect(() =>
      readAcceptanceConfig({
        ...productionEnv,
        TELEGRAM_BOT_TOKEN: "configured",
        TELEGRAM_OWNER_CHAT_ID: "-100123",
        TELEGRAM_ALLOWED_CHAT_IDS: "-100123"
      })
    ).toThrow(/private-user chat ID/);
  });

  it("refuses non-production runtime configuration", () => {
    expect(() =>
      readAcceptanceConfig({
        ...productionEnv,
        VERCEL_ENV: "preview",
        TELEGRAM_BOT_TOKEN: "configured",
        TELEGRAM_OWNER_CHAT_ID: "1001",
        TELEGRAM_ALLOWED_CHAT_IDS: "1001"
      })
    ).toThrow(/non-production Vercel/);
  });

  it("requires the exact confirmation for runtime acceptance", () => {
    expect(() =>
      ProcessPublicationsRequestSchema.parse({
        operation: "telegram_acceptance",
        confirmation: "send"
      })
    ).toThrow(/Exact Telegram production acceptance confirmation/);

    expect(
      ProcessPublicationsRequestSchema.parse({
        operation: "telegram_acceptance",
        confirmation: "SEND ONE PRIVATE OWNER TELEGRAM"
      })
    ).toMatchObject({ operation: "telegram_acceptance" });

    expect(
      ProcessPublicationsRequestSchema.parse({
        operation: "telegram_acceptance_status"
      })
    ).toMatchObject({
      operation: "telegram_acceptance_status"
    });

    expect(() =>
      ProcessPublicationsRequestSchema.parse({
        operation: "telegram_acceptance_recover_failed",
        confirmation: "retry"
      })
    ).toThrow(/Exact Telegram production recovery confirmation/);

    expect(
      ProcessPublicationsRequestSchema.parse({
        operation: "telegram_acceptance_recover_failed",
        confirmation: "RETRY CONFIRMED FAILED PRIVATE TELEGRAM"
      })
    ).toMatchObject({
      operation: "telegram_acceptance_recover_failed"
    });
  });

  it("checks that the configured owner target is a reachable private chat", async () => {
    const reachable = await checkTelegramPrivateChatAccess(
      "token",
      "1001",
      async () => Response.json({
        ok: true,
        result: { type: "private" }
      })
    );
    expect(reachable).toMatchObject({
      ok: true,
      statusCode: 200,
      errorCode: null
    });

    const rejected = await checkTelegramPrivateChatAccess(
      "token",
      "1001",
      async () => Response.json(
        { ok: false, description: "chat not found" },
        { status: 400 }
      )
    );
    expect(rejected).toMatchObject({
      ok: false,
      statusCode: 400,
      errorCode: "HTTP_400"
    });
    expect(rejected.message).not.toContain("1001");
  });

  it("returns safe bot identity fields without exposing the token", async () => {
    const identity = await getTelegramBotIdentity(
      "secret-token",
      async () => Response.json({
        ok: true,
        result: {
          id: 123,
          is_bot: true,
          first_name: "EduFerma",
          username: "eduferma_test_bot"
        }
      })
    );

    expect(identity).toEqual({
      ok: true,
      statusCode: 200,
      username: "eduferma_test_bot",
      displayName: "EduFerma",
      errorCode: null
    });
    expect(JSON.stringify(identity)).not.toContain(
      "secret-token"
    );
  });

  it("requires exactly one sent delivery with a provider message ID", () => {
    const state = summarizeAcceptanceDetail(true, publication());
    expect(() => assertCompletedAcceptance(state)).not.toThrow();

    const duplicate = summarizeAcceptanceDetail(
      true,
      publication({
        deliveries: [
          ...publication().deliveries,
          {
            ...publication().deliveries[0],
            id: "00000000-0000-4000-8000-000000000003"
          }
        ]
      })
    );
    expect(() => assertCompletedAcceptance(duplicate)).toThrow(
      /exactly one/
    );
  });

  it("summarizes persisted delivery errors without exposing target configuration", () => {
    const state = summarizeAcceptanceDetail(
      true,
      publication({
        status: "failed",
        deliveries: [{
          ...publication().deliveries[0],
          status: "failed",
          providerMessageId: null,
          errorCode: "400",
          errorMessage: "Telegram sendMessage failed"
        }]
      })
    );

    expect(state).toMatchObject({
      postStatus: "failed",
      sentDeliveryCount: 0,
      deliveryStatuses: ["failed"],
      deliveryErrorCodes: ["400"],
      deliveryErrorMessages: ["Telegram sendMessage failed"]
    });
    expect(() =>
      assertRecoverableAcceptance(state)
    ).not.toThrow();

    expect(() =>
      assertRecoverableAcceptance({
        ...state,
        deliveryErrorCodes: ["NETWORK_ERROR"]
      })
    ).toThrow(/only for one persisted HTTP 400 rejection/);

    expect(() =>
      assertRecoverableAcceptance({
        ...state,
        deliveryProviderMessageIds: ["ambiguous"]
      })
    ).toThrow(/no provider message ID/);
  });
});
