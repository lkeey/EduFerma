import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicationCms } from "../../apps/web/src/components/platform/publication-cms";

describe("publication cms", () => {
  it("renders the main teacher publication sections from initial data", () => {
    const html = renderToStaticMarkup(
      <PublicationCms
        isOwner={true}
        initial={{
          posts: [
            {
              id: "2df0d2ef-5281-4788-8f97-0f14f4f3a917",
              duplicateOfPostId: null,
              revision: 1,
              title: "Weekly digest",
              excerpt: "Intro",
              bodyMd: "Body",
              audience: "public",
              contentHash: null,
              status: "draft",
              scheduledFor: null,
              publishedAt: null,
              publishAllowed: true,
              createdAt: "2026-07-16T10:00:00.000Z",
              updatedAt: "2026-07-16T10:00:00.000Z",
              metadata: {},
              targets: [],
              deliveries: [],
              history: []
            }
          ],
          targets: [
            {
              id: "baad8fe9-56b8-4b48-bd31-df3cc469ebc2",
              slug: "telegram-public",
              title: "Telegram public",
              provider: "telegram",
              status: "active",
              config: { recipientMode: "static" },
              lastPublishedAt: null,
              recipientMode: "static",
              recipientCount: 1,
              isEditableByOwner: true,
              healthStatus: "ok",
              healthMessage: "Telegram healthy",
              createdAt: "2026-07-16T10:00:00.000Z",
              updatedAt: "2026-07-16T10:00:00.000Z"
            }
          ],
          health: [
            {
              provider: "telegram",
              status: "ok",
              message: "Telegram healthy",
              checkedAt: "2026-07-16T10:00:00.000Z"
            }
          ]
        }}
      />
    );

    expect(html).toContain("Редактор публикации");
    expect(html).toContain("Provider Health");
    expect(html).toContain("Owner Targets");
    expect(html).toContain("Weekly digest");
  });
});
