import { describe, expect, it, vi } from "vitest";
import { buildDeliveryKey, createTelegramProvider, createVkProvider, renderPublicationPreview } from "../../apps/web/src/server/publications/service";

describe("publication providers", () => {
  it("checks Telegram health and sends messages through the Bot API with persisted ids", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/getMe")) {
        return new Response(JSON.stringify({ ok: true, result: { id: 1, username: "eduferma_bot" } }), { status: 200 });
      }

      expect(url).toContain("/sendMessage");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        chat_id: "1001",
        text: "Preview text"
      });
      return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 });
    });

    const provider = createTelegramProvider(
      {
        TELEGRAM_BOT_TOKEN: "123:abc",
        TELEGRAM_ALLOWED_CHAT_IDS: "1001"
      },
      fetchImpl as typeof fetch
    );

    await expect(provider.getHealth()).resolves.toMatchObject({
      provider: "telegram",
      status: "ok"
    });
    await expect(provider.send({
      post: { bodyMd: "Preview text", excerpt: null } as never,
      target: { targetType: "telegram", config: { recipientMode: "static", chatId: "1001" } } as never,
      text: "Preview text"
    })).resolves.toMatchObject({
      status: "sent",
      providerMessageId: "42"
    });
  });

  it("blocks Telegram sends when the target chat is outside the allowlist", async () => {
    const provider = createTelegramProvider(
      {
        TELEGRAM_BOT_TOKEN: "123:abc",
        TELEGRAM_ALLOWED_CHAT_IDS: "1001"
      },
      vi.fn() as typeof fetch
    );

    await expect(provider.send({
      post: { bodyMd: "Preview text", excerpt: null } as never,
      target: { targetType: "telegram", config: { recipientMode: "static", chatId: "2002" } } as never,
      text: "Preview text"
    })).resolves.toMatchObject({
      status: "failed",
      errorCode: "TARGET_NOT_ALLOWED"
    });
  });

  it("keeps VK in setup-required or disabled-send mode", async () => {
    const unconfigured = createVkProvider({});
    await expect(unconfigured.getHealth()).resolves.toMatchObject({
      provider: "vk",
      status: "setup_required"
    });

    const configured = createVkProvider({
      VK_ACCESS_TOKEN: "token",
      VK_GROUP_ID: "1"
    });
    await expect(configured.getHealth()).resolves.toMatchObject({
      provider: "vk",
      status: "ok"
    });
    await expect(configured.send({
      post: { bodyMd: "Post body", excerpt: "Intro" } as never,
      target: { targetType: "vk", config: {} } as never,
      text: "Post body"
    })).resolves.toMatchObject({
      status: "failed",
      errorCode: "LIVE_SEND_DISABLED"
    });
  });

  it("builds deterministic delivery keys and preview text", () => {
    expect(buildDeliveryKey("post-1", "target-1", 3)).toBe("post-1:target-1:3");
    expect(renderPublicationPreview("Body", "Intro")).toBe("Intro\n\nBody");
  });
});
