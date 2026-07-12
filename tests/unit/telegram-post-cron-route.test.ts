import { describe, expect, it } from "vitest";
import {
  handleTelegramPostCron,
  runTelegramPostCron
} from "../../apps/web/src/server/telegram/post-cron";
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

function cronRequest(secret = "cron-secret", method = "GET", body?: unknown) {
  return new Request("http://localhost/api/integrations/telegram/posts/cron", {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
      "x-vercel-cron-schedule": "0 8 * * *"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function sender(sent: TelegramTextSendInput[]): TelegramTextSender {
  return {
    async sendText(input) {
      sent.push(input);
      return { status: "sent", sendAttempted: true, providerMessageId: `message-${sent.length}` };
    }
  };
}

describe("Telegram post cron route", () => {
  it("rejects invalid cron secrets without touching subscribers", async () => {
    let listCalled = false;
    const response = await handleTelegramPostCron(cronRequest("wrong-secret"), {
      env: {
        TELEGRAM_POSTS_CRON_SECRET: "cron-secret",
        TELEGRAM_BOT_TOKEN: "token-that-must-not-appear",
        TELEGRAM_BROADCAST_ENABLED: "true"
      },
      async listSubscribers() {
        listCalled = true;
        return [subscriber("subscriber-1", "1001")];
      }
    });
    const body = await response.text();

    expect(response.status).toBe(401);
    expect(body).toContain("UNAUTHORIZED");
    expect(body).not.toContain("token-that-must-not-appear");
    expect(listCalled).toBe(false);
  });

  it("generates a daily draft on GET without sending while autosend is disabled", async () => {
    const sent: TelegramTextSendInput[] = [];
    let listCalled = false;

    const response = await handleTelegramPostCron(cronRequest(), {
      env: {
        TELEGRAM_POSTS_CRON_SECRET: "cron-secret",
        TELEGRAM_BOT_TOKEN: "configured",
        TELEGRAM_BROADCAST_ENABLED: "true",
        TELEGRAM_POSTS_AUTOSEND_ENABLED: "false",
        NEXT_PUBLIC_APP_URL: "https://eduferma.example"
      },
      now: "2026-07-11T10:00:00.000Z",
      async listSubscribers() {
        listCalled = true;
        return [subscriber("subscriber-1", "1001")];
      },
      sender: sender(sent)
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      job: "telegram:posts:cron",
      mode: "approval_required",
      sendAttempted: false,
      schedule: "0 8 * * *"
    });
    expect(body.draftId).toContain("social_draft_");
    expect(listCalled).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("sends the generated public post to active subscribers when explicitly enabled", async () => {
    const sent: TelegramTextSendInput[] = [];
    const outboxIds: string[] = [];

    const result = await runTelegramPostCron({
      env: {
        TELEGRAM_POSTS_CRON_SECRET: "cron-secret",
        TELEGRAM_BOT_TOKEN: "configured",
        TELEGRAM_BROADCAST_ENABLED: "true",
        TELEGRAM_POSTS_AUTOSEND_ENABLED: "true",
        NEXT_PUBLIC_APP_URL: "https://eduferma.example"
      },
      now: "2026-07-11T10:00:00.000Z",
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
    });

    expect(result).toMatchObject({
      mode: "sent",
      subscriberCount: 2,
      sentCount: 2,
      failedCount: 0
    });
    expect(outboxIds).toEqual(["outbox-subscriber-1", "outbox-subscriber-2"]);
    expect(sent.map((message) => message.chatId)).toEqual(["1001", "1002"]);
    expect(sent[0]?.text).toContain("EduFerma");
    expect(sent[0]?.text).not.toContain("answer_json");
    expect(sent[0]?.text).not.toContain("solution_md");
  });

  it("sends manually approved public text via POST", async () => {
    const sent: TelegramTextSendInput[] = [];

    const response = await handleTelegramPostCron(
      cronRequest("cron-secret", "POST", {
        approvedText: "Публичный пост EduFerma: сегодня тренируем внимательное чтение условия."
      }),
      {
        env: {
          TELEGRAM_POSTS_CRON_SECRET: "cron-secret",
          TELEGRAM_BOT_TOKEN: "configured",
          TELEGRAM_BROADCAST_ENABLED: "true"
        },
        now: "2026-07-11T10:00:00.000Z",
        async listSubscribers() {
          return [subscriber("subscriber-1", "1001")];
        },
        async enqueueOutbox(input) {
          return { id: `outbox-${input.subscriberId}` };
        },
        async markSent() {},
        async markFailed() {},
        sender: sender(sent)
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      job: "telegram:posts:manual",
      mode: "sent",
      sentCount: 1
    });
    expect(sent[0]?.text).toContain("Публичный пост EduFerma");
  });

  it("validates manual POST body before broadcasting", async () => {
    let listCalled = false;
    const response = await handleTelegramPostCron(cronRequest("cron-secret", "POST", {}), {
      env: {
        TELEGRAM_POSTS_CRON_SECRET: "cron-secret",
        TELEGRAM_BROADCAST_ENABLED: "true"
      },
      async listSubscribers() {
        listCalled = true;
        return [];
      }
    });

    expect(response.status).toBe(400);
    expect(listCalled).toBe(false);
  });

  it("blocks unsafe manual text before reading subscribers", async () => {
    let listCalled = false;
    const response = await handleTelegramPostCron(
      cronRequest("cron-secret", "POST", {
        approvedText: "student_id=42 answer_json={\"answer\":\"7\"}"
      }),
      {
        env: {
          TELEGRAM_POSTS_CRON_SECRET: "cron-secret",
          TELEGRAM_BOT_TOKEN: "configured",
          TELEGRAM_BROADCAST_ENABLED: "true"
        },
        async listSubscribers() {
          listCalled = true;
          return [];
        }
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("blocked");
    expect(body.safetyIssueCount).toBeGreaterThan(0);
    expect(listCalled).toBe(false);
  });
});
