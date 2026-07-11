import { describe, expect, it } from "vitest";
import { runTelegramBroadcastToSubscribers } from "../../apps/worker/src/telegram-broadcast";
import type { TelegramTextSendInput, TelegramTextSender } from "../../packages/core/src/telegram";
import type { TelegramSubscriberRecord } from "../../packages/db/src/telegram";

function subscriber(id: string, chatId: string): TelegramSubscriberRecord {
  const now = new Date("2026-07-11T10:00:00.000Z");
  return {
    id,
    telegramUserId: chatId,
    chatId,
    chatType: "private",
    username: null,
    firstName: null,
    lastName: null,
    languageCode: null,
    isActive: true,
    subscribedAt: now,
    unsubscribedAt: null,
    lastStartAt: now,
    lastCommandAt: now,
    source: "telegram_start",
    metadata: {},
    createdAt: now,
    updatedAt: now
  };
}

function sender(sent: TelegramTextSendInput[]): TelegramTextSender {
  return {
    async sendText(input) {
      sent.push(input);
      return { status: "sent", sendAttempted: true, providerMessageId: `message-${sent.length}` };
    }
  };
}

describe("Telegram broadcast job", () => {
  it("is disabled by default and does not read subscribers or send", async () => {
    let listCalled = false;
    const sent: TelegramTextSendInput[] = [];

    const result = await runTelegramBroadcastToSubscribers(
      {
        env: {
          TELEGRAM_BOT_TOKEN: "configured-but-unused"
        },
        approvedText: "Публичный пост EduFerma без персональных данных."
      },
      {
        async listSubscribers() {
          listCalled = true;
          return [subscriber("subscriber-1", "1001")];
        },
        sender: sender(sent)
      }
    );

    expect(result.mode).toBe("disabled");
    expect(result.sendAttempted).toBe(false);
    expect(listCalled).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("broadcasts approved public-safe text only to active subscribers", async () => {
    const sent: TelegramTextSendInput[] = [];
    const outboxIds: string[] = [];

    const result = await runTelegramBroadcastToSubscribers(
      {
        env: {
          TELEGRAM_BROADCAST_ENABLED: "true",
          TELEGRAM_BOT_TOKEN: "configured"
        },
        approvedText: "Новый публичный пост EduFerma: как не потерять единицы измерения в задаче.",
        now: "2026-07-11T10:00:00.000Z"
      },
      {
        async listSubscribers() {
          return [subscriber("subscriber-1", "1001"), subscriber("subscriber-2", "1002")];
        },
        async enqueueOutbox(input) {
          const id = `outbox-${input.subscriberId}`;
          outboxIds.push(id);
          return { id };
        },
        async markSent() {},
        async markFailed() {},
        sender: sender(sent)
      }
    );

    expect(result).toMatchObject({
      mode: "sent",
      subscriberCount: 2,
      sentCount: 2,
      failedCount: 0
    });
    expect(outboxIds).toEqual(["outbox-subscriber-1", "outbox-subscriber-2"]);
    expect(sent.map((message) => message.chatId)).toEqual(["1001", "1002"]);
    expect(sent[0]?.text).toContain("Новый публичный пост EduFerma");
  });

  it("blocks unsafe Telegram posts with student fields before sending", async () => {
    const sent: TelegramTextSendInput[] = [];
    const result = await runTelegramBroadcastToSubscribers(
      {
        env: {
          TELEGRAM_BROADCAST_ENABLED: "true",
          TELEGRAM_BOT_TOKEN: "configured"
        },
        approvedText: "student_id=42: ученик решил задачу, answer_json={\"answers\":[\"7\"]}"
      },
      {
        async listSubscribers() {
          throw new Error("subscriber list must not be read for unsafe text");
        },
        sender: sender(sent)
      }
    );

    expect(result.mode).toBe("blocked");
    expect(result.safetyIssueCount).toBeGreaterThan(0);
    expect(result.sendAttempted).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("requires explicitly approved text before enabled live broadcast", async () => {
    const result = await runTelegramBroadcastToSubscribers({
      env: {
        TELEGRAM_BROADCAST_ENABLED: "true",
        TELEGRAM_BOT_TOKEN: "configured"
      }
    });

    expect(result.mode).toBe("blocked");
    expect(result.reason).toContain("--approved-text");
  });
});
