import { describe, expect, it } from "vitest";
import { filterPublicResults } from "../../packages/core/src/testimonials";

describe("filterPublicResults", () => {
  it("renders only published results with granted consent", () => {
    const visible = filterPublicResults([
      { title: "ok", summary: "ok", published: true, consent_status: "granted" },
      { title: "hidden", summary: "pending", published: true, consent_status: "pending" },
      { title: "draft", summary: "draft", published: false, consent_status: "granted" }
    ]);

    expect(visible).toHaveLength(1);
    expect(visible[0]?.title).toBe("ok");
  });
});
