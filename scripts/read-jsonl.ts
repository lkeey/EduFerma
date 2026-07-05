import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export async function readJsonl(pathname: string, limit?: number): Promise<unknown[]> {
  const rows: unknown[] = [];
  const stream = createReadStream(pathname, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    rows.push(JSON.parse(trimmed));
    if (limit && rows.length >= limit) break;
  }

  return rows;
}
