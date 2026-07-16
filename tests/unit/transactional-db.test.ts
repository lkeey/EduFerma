import { describe, expect, it } from "vitest";
import { createTransactionalDb } from "../../scripts/lib/transactional-db";

describe("transactional DB client", () => {
  it("uses the WebSocket driver that supports interactive transactions", async () => {
    const client = createTransactionalDb({
      DATABASE_URL: "postgresql://user:password@localhost:5432/eduferma",
      EDUFERMA_DB_ENV: "test"
    });

    expect(typeof client.db.transaction).toBe("function");
    await client.close();
  });
});
