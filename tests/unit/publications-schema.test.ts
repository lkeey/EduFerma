import { describe, expect, it } from "vitest";
import {
  CreatePublicationRequestSchema,
  CreatePublicationTargetRequestSchema,
  PublicationActionResponseSchema,
  PublicationTargetMutationResponseSchema
} from "../../packages/validators/src/publications";

describe("publication schemas", () => {
  it("accepts valid publication drafts and target mutations", () => {
    const publication = CreatePublicationRequestSchema.parse({
      title: "Weekly digest",
      bodyMd: "Body",
      targetIds: []
    });

    expect(publication).toMatchObject({
      title: "Weekly digest",
      bodyMd: "Body"
    });

    const target = CreatePublicationTargetRequestSchema.parse({
      slug: "telegram-public",
      title: "Telegram public",
      provider: "telegram",
      config: { recipientMode: "static", chatId: "1001" }
    });

    expect(target.slug).toBe("telegram-public");
  });

  it("rejects malformed target slugs and keeps response contracts named", () => {
    expect(() => CreatePublicationTargetRequestSchema.parse({
      slug: "Telegram Public",
      title: "Telegram public",
      provider: "telegram",
      config: {}
    })).toThrow();

    expect(() => PublicationActionResponseSchema.parse({
      publication: { id: "not-a-publication" },
      action: "created"
    })).toThrow();

    expect(() => PublicationTargetMutationResponseSchema.parse({
      target: { id: "not-a-target" },
      action: "created"
    })).toThrow();
  });
});
