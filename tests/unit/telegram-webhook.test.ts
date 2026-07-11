import { describe, expect, it } from "vitest";
import { handleTelegramWebhook, type TelegramSubscriberStore } from "../../apps/web/src/server/telegram/webhook";
import type { TelegramTextSendInput, TelegramTextSender } from "../../packages/core/src/telegram";

function telegramRequest(body: unknown, secret = "webhook-secret") {
  return new Request("http://localhost/api/integrations/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret
    },
    body: JSON.stringify(body)
  });
}

function update(text: string) {
  return {
    update_id: 1001,
    message: {
      message_id: 10,
      from: {
        id: 123456,
        is_bot: false,
        first_name: "Ada",
        last_name: "Lovelace",
        username: "ada_l",
        language_code: "ru"
      },
      chat: {
        id: 123456,
        type: "private"
      },
      text
    }
  };
}

function deps() {
  const subscribers: unknown[] = [];
  const sent: TelegramTextSendInput[] = [];
  const subscriberStore: TelegramSubscriberStore = {
    async upsertSubscriber(input) {
      subscribers.push(input);
      return { id: "subscriber-1" };
    }
  };
  const sender: TelegramTextSender = {
    async sendText(input) {
      sent.push(input);
      return { status: "sent", sendAttempted: true, providerMessageId: "message-1" };
    }
  };

  return { subscribers, sent, subscriberStore, sender };
}

describe("Telegram webhook", () => {
  it("rejects requests with an invalid Telegram secret without leaking configured env values", async () => {
    const d = deps();
    const response = await handleTelegramWebhook(telegramRequest(update("/start"), "wrong-secret"), {
      env: {
        TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
        TELEGRAM_BOT_TOKEN: "token-that-must-not-appear",
        NEXT_PUBLIC_APP_URL: "https://eduferma.example"
      },
      subscriberStore: d.subscriberStore,
      sender: d.sender
    });
    const body = await response.text();

    expect(response.status).toBe(401);
    expect(body).toContain("UNAUTHORIZED");
    expect(body).not.toContain("token-that-must-not-appear");
    expect(d.subscribers).toHaveLength(0);
    expect(d.sent).toHaveLength(0);
  });

  it("subscribes Telegram users on /start and replies with the site entry point", async () => {
    const d = deps();
    const response = await handleTelegramWebhook(telegramRequest(update("/start")), {
      env: {
        TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
        TELEGRAM_BOT_TOKEN: "configured",
        NEXT_PUBLIC_APP_URL: "https://eduferma.example"
      },
      subscriberStore: d.subscriberStore,
      sender: d.sender
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, handled: true, command: "start" });
    expect(d.subscribers).toEqual([
      expect.objectContaining({
        telegramUserId: "123456",
        chatId: "123456",
        chatType: "private",
        username: "ada_l",
        firstName: "Ada",
        source: "telegram_start"
      })
    ]);
    expect(d.sent[0]).toMatchObject({ chatId: "123456" });
    expect(d.sent[0]?.text).toContain("EduFerma");
    expect(d.sent[0]?.text).toContain("https://eduferma.example");
    expect(d.sent[0]?.text).toContain("https://t.me/lkeyit");
  });

  it("answers /about and /info without inventing biography", async () => {
    const d = deps();
    const response = await handleTelegramWebhook(telegramRequest(update("/about")), {
      env: {
        TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
        TELEGRAM_BOT_TOKEN: "configured",
        NEXT_PUBLIC_APP_URL: "https://eduferma.example"
      },
      subscriberStore: d.subscriberStore,
      sender: d.sender
    });

    expect(response.status).toBe(200);
    expect(d.subscribers).toHaveLength(0);
    expect(d.sent[0]?.text).toContain("подготовка с преподавателем");
    expect(d.sent[0]?.text).toContain("персональные планы");
    expect(d.sent[0]?.text).toContain("база задач");
    expect(d.sent[0]?.text).toContain("личный кабинет");
    expect(d.sent[0]?.text).toContain("https://eduferma.example");
    expect(d.sent[0]?.text).toContain("https://t.me/lkeyit");
  });

  it("validates webhook env lazily at request time", async () => {
    const response = await handleTelegramWebhook(telegramRequest(update("/start")), {
      env: {},
      subscriberStore: deps().subscriberStore,
      sender: deps().sender
    });
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("SETUP_REQUIRED");
  });
});
