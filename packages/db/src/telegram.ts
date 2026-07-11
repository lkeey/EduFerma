import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { telegramBroadcastOutbox, telegramSubscribers } from "./schema";

type Db = ReturnType<typeof getDb>;

export type TelegramSubscriberInput = {
  telegramUserId: string;
  chatId: string;
  chatType: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type TelegramSubscriberRecord = typeof telegramSubscribers.$inferSelect;
export type TelegramBroadcastOutboxRecord = typeof telegramBroadcastOutbox.$inferSelect;

export type TelegramOutboxInput = {
  subscriberId: string;
  broadcastKey: string;
  chatId: string;
  messageText: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export async function upsertTelegramSubscriber(
  input: TelegramSubscriberInput,
  db: Db = getDb()
): Promise<TelegramSubscriberRecord> {
  const now = new Date();
  const [subscriber] = await db
    .insert(telegramSubscribers)
    .values({
      telegramUserId: input.telegramUserId,
      chatId: input.chatId,
      chatType: input.chatType,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: input.languageCode,
      source: input.source ?? "telegram_start",
      metadata: input.metadata ?? {},
      isActive: true,
      subscribedAt: now,
      lastStartAt: now,
      lastCommandAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: telegramSubscribers.chatId,
      set: {
        telegramUserId: input.telegramUserId,
        chatType: input.chatType,
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        languageCode: input.languageCode,
        source: input.source ?? "telegram_start",
        metadata: input.metadata ?? {},
        isActive: true,
        unsubscribedAt: null,
        lastStartAt: now,
        lastCommandAt: now,
        updatedAt: now
      }
    })
    .returning();

  return subscriber;
}

export async function listActiveTelegramSubscribers(db: Db = getDb()): Promise<TelegramSubscriberRecord[]> {
  return db.query.telegramSubscribers.findMany({
    where: (row) => eq(row.isActive, true),
    orderBy: (row, { asc }) => [asc(row.createdAt)]
  });
}

export async function enqueueTelegramBroadcastOutbox(
  input: TelegramOutboxInput,
  db: Db = getDb()
): Promise<TelegramBroadcastOutboxRecord | undefined> {
  const [record] = await db
    .insert(telegramBroadcastOutbox)
    .values({
      subscriberId: input.subscriberId,
      broadcastKey: input.broadcastKey,
      chatId: input.chatId,
      messageText: input.messageText,
      status: input.status ?? "pending",
      metadata: input.metadata ?? {}
    })
    .onConflictDoNothing({
      target: [telegramBroadcastOutbox.subscriberId, telegramBroadcastOutbox.broadcastKey]
    })
    .returning();

  return record;
}

export async function markTelegramBroadcastOutboxSent(
  id: string,
  providerMessageId: string | undefined,
  db: Db = getDb()
): Promise<void> {
  await db
    .update(telegramBroadcastOutbox)
    .set({
      status: "sent",
      providerMessageId,
      attempts: 1,
      sentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(telegramBroadcastOutbox.id, id));
}

export async function markTelegramBroadcastOutboxFailed(
  id: string,
  errorCode: string,
  errorMessage: string,
  db: Db = getDb()
): Promise<void> {
  await db
    .update(telegramBroadcastOutbox)
    .set({
      status: "failed",
      attempts: 1,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      updatedAt: new Date()
    })
    .where(eq(telegramBroadcastOutbox.id, id));
}
