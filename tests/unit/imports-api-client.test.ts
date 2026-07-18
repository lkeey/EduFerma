import { describe, expect, it, vi } from "vitest";
import { createImportsApi, createTeacherApi, EduFermaApiClient } from "@eduferma/api-client";

describe("teacher task-bank API client", () => {
  it("serializes typed task-bank filters for both teacher client entry points", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ tasks: [] })) as unknown as typeof fetch;
    const client = new EduFermaApiClient({ baseUrl: "https://example.test", fetchImpl });
    const query = {
      learningTrack: "ege_informatics",
      exam: "ЕГЭ",
      taskNumber: "7",
      topic: "Графики",
      prototypeId: "ege_7_graph_reading",
      difficultyLevel: "basic" as const,
      sourceName: "original",
      status: "active" as const
    };

    await createImportsApi(client).taskBank(query);
    await createTeacherApi(client).taskBank(query);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const [url] of fetchImpl.mock.calls) {
      const parsed = new URL(String(url));
      expect(Object.fromEntries(parsed.searchParams.entries())).toEqual(query);
    }
  });
});
