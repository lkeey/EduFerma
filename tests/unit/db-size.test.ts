import { describe, expect, it } from "vitest";
import {
  evaluateDbSizeLimit,
  formatBytes,
  megabytesToBytes,
  parsePgSizeToBytes
} from "../../packages/core/src/db-size";

describe("database size guard", () => {
  it("parses Postgres pretty sizes and raw byte values", () => {
    expect(parsePgSizeToBytes("1024")).toBe(1024);
    expect(parsePgSizeToBytes("1 kB")).toBe(1024);
    expect(parsePgSizeToBytes("1 MB")).toBe(1024 ** 2);
    expect(parsePgSizeToBytes(2048n)).toBe(2048);
  });

  it("evaluates projected DB size against the configured limit", () => {
    const limitBytes = megabytesToBytes(500);
    const ok = evaluateDbSizeLimit({
      currentBytes: megabytesToBytes(100),
      estimatedImportBytes: megabytesToBytes(25),
      limitBytes
    });
    const tooLarge = evaluateDbSizeLimit({
      currentBytes: megabytesToBytes(499),
      estimatedImportBytes: megabytesToBytes(2),
      limitBytes
    });

    expect(ok.withinLimit).toBe(true);
    expect(tooLarge.withinLimit).toBe(false);
    expect(formatBytes(limitBytes)).toBe("500.0 MiB");
  });
});
