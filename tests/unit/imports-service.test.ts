import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  buildImportRowsApplyFilter,
  buildTaskFilters,
  extractPdfText,
  fetchRemoteSource,
  isIpAddressBlocked,
  normalizeDifficulty,
  parseImportPayload
} from "../../apps/web/src/server/imports/service";
import {
  getPrivateImportBlob,
  putPrivateImportBlob
} from "../../apps/web/src/server/imports/blob-storage";
import { validateImportUploadRequest } from "../../apps/web/src/server/imports/upload-validation";

describe("task import parsing", () => {
  it("keeps ready or applied status mandatory when apply is narrowed by taskIds", () => {
    const query = new PgDialect().sqlToQuery(
      buildImportRowsApplyFilter("11111111-1111-1111-1111-111111111111", ["selected-task"])!
    );

    expect(query.sql).toContain('"import_rows"."status" = $2 or "import_rows"."status" = $3');
    expect(query.sql).toContain("'task_id'");
    expect(query.params).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "ready",
      "applied",
      "selected-task"
    ]);
  });

  it("builds exact server-side topic, prototype, and source filters", () => {
    const query = new PgDialect().sqlToQuery(
      buildTaskFilters({ topic: "Графики", prototypeId: "ege_7_graph", sourceName: "Kompege" })!
    );

    expect(query.sql).toContain('"tasks"."topic" = $1');
    expect(query.sql).toContain('"tasks"."prototype_id" = $2');
    expect(query.sql).toContain('"tasks"."source_name" = $3');
    expect(query.params).toEqual(["Графики", "ege_7_graph", "Kompege"]);
  });

  it("normalizes numeric difficulty levels into platform buckets", () => {
    expect(normalizeDifficulty(1)).toBe("basic");
    expect(normalizeDifficulty(2)).toBe("medium");
    expect(normalizeDifficulty(3)).toBe("advanced");
    expect(normalizeDifficulty(4)).toBe("trap");
    expect(normalizeDifficulty(5)).toBe("trap");
    expect(normalizeDifficulty(9)).toBe("unknown");
  });

  it("blocks localhost and private SSRF targets", () => {
    expect(isIpAddressBlocked("127.0.0.1")).toBe(true);
    expect(isIpAddressBlocked("10.1.2.3")).toBe(true);
    expect(isIpAddressBlocked("172.20.1.2")).toBe(true);
    expect(isIpAddressBlocked("192.168.1.1")).toBe(true);
    expect(isIpAddressBlocked("169.254.1.1")).toBe(true);
    expect(isIpAddressBlocked("100.64.1.1")).toBe(true);
    expect(isIpAddressBlocked("::1")).toBe(true);
    expect(isIpAddressBlocked("::ffff:127.0.0.1")).toBe(true);
    expect(isIpAddressBlocked("8.8.8.8")).toBe(false);
  });

  it("rejects literal IPs and non-allowlisted URL import hosts before fetching", async () => {
    await expect(fetchRemoteSource("http://127.0.0.1/task.json")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR"
    });
    await expect(fetchRemoteSource("https://example.com/task.json")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR"
    });
  });

  it("parses JSON imports into ready rows when fields are complete", async () => {
    const payload = new TextEncoder().encode(
      JSON.stringify([
        {
          task_id: "json-task-1",
          learning_track: "ege_informatics",
          source_id: "json-source",
          source_name: "JSON source",
          statement_md: "Полный текст задачи для JSON импорта.",
          difficulty_level: 2,
          skill_atoms: ["logic"],
          answer: "42",
          verification_status: "verified",
          license_status: "original",
          status: "active"
        }
      ])
    );

    const result = await parseImportPayload({
      bytes: payload,
      contentType: "application/json",
      sourceName: "JSON source"
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      status: "ready",
      normalizedTask: {
        task_id: "json-task-1",
        difficulty_level: "medium"
      }
    });
  });

  it("keeps HTML URL imports evidence-first and reviewable when answer extraction is uncertain", async () => {
    const payload = new TextEncoder().encode(`
      <html>
        <head><title>Task 7</title></head>
        <body>
          <h1>Задание 7</h1>
          <p>Определите значение функции по графику и обоснуйте решение подробно.</p>
        </body>
      </html>
    `);

    const result = await parseImportPayload({
      bytes: payload,
      contentType: "text/html",
      sourceUrl: "https://kompege.ru/task/7"
    });

    expect(result.rows[0].status).toBe("needs_review");
    expect(result.rows[0].evidence[0]).toMatchObject({
      kind: "url",
      url: "https://kompege.ru/task/7"
    });
  });

  it("recognizes the exact allowlisted Shkolkovo host and retains private raw evidence", async () => {
    const payload = new TextEncoder().encode("<html><body>Задание. Ответ: 42</body></html>");
    const result = await parseImportPayload({
      bytes: payload,
      contentType: "text/html",
      sourceUrl: "https://3.shkolkovo.online/catalog/123",
      storageKey: "task-imports/hash/source.html"
    });

    expect(result.sourceName).toBe("Shkolkovo");
    expect(result.rows[0].evidence[0]).toMatchObject({
      storageKey: "task-imports/hash/source.html"
    });
  });

  it("returns a validation error for malformed structured payloads", async () => {
    await expect(
      parseImportPayload({
        bytes: new TextEncoder().encode("{invalid"),
        contentType: "application/json",
        sourceName: "Broken JSON"
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR"
    });
  });

  it("round-trips raw imports through the non-production private storage fallback", async () => {
    const bytes = new TextEncoder().encode("task,answer\n1,42");
    const sha256 = "a".repeat(64);
    const stored = await putPrivateImportBlob({
      bytes,
      contentType: "text/csv",
      filename: "tasks.csv",
      sha256
    });

    expect(stored.storageKey).toBe(`local/${sha256}/tasks.csv`);
    await expect(getPrivateImportBlob(stored.storageKey, 1024)).resolves.toEqual(bytes);
  });

  it("validates upload content types and raw filenames at the route boundary", () => {
    expect(() =>
      validateImportUploadRequest(
        new Request("http://localhost/upload", {
          method: "POST",
          headers: { "content-type": "image/png" },
          body: "image"
        })
      )
    ).toThrow("Unsupported upload content type");
    expect(() =>
      validateImportUploadRequest(
        new Request("http://localhost/upload", {
          method: "POST",
          headers: { "content-type": "text/csv" },
          body: "task,answer"
        })
      )
    ).toThrow("x-upload-filename");
    expect(() =>
      validateImportUploadRequest(
        new Request("http://localhost/upload", {
          method: "POST",
          headers: { "content-type": "text/csv", "x-upload-filename": "tasks.csv" },
          body: "task,answer"
        })
      )
    ).not.toThrow();
  });

  it("extracts simple text operators from PDF content streams", () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\nBT (Answer 42) Tj ET");
    expect(extractPdfText(pdf)).toContain("Answer 42");
  });
});
