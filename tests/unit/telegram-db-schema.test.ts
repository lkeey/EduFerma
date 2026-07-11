import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { telegramBroadcastOutbox, telegramSubscribers } from "@eduferma/db";

const root = process.cwd();

describe("Telegram DB schema", () => {
  it("exports subscriber and broadcast outbox tables", () => {
    expect(telegramSubscribers).toBeDefined();
    expect(telegramBroadcastOutbox).toBeDefined();
  });

  it("has a migration for Telegram subscribers and broadcast outbox", () => {
    const drizzleDir = join(root, "packages/db/drizzle");
    const sql = readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(join(drizzleDir, file), "utf8"))
      .join("\n");

    expect(existsSync(drizzleDir)).toBe(true);
    expect(sql).toContain('CREATE TABLE "telegram_subscribers"');
    expect(sql).toContain('CREATE TABLE "telegram_broadcast_outbox"');
    expect(sql).toContain('"telegram_subscribers_chat_id_idx"');
    expect(sql).toContain('"telegram_broadcast_outbox_subscriber_broadcast_idx"');
  });
});
