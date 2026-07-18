import { ServiceConflictError } from "@eduferma/core";
import { describe, expect, it } from "vitest";
import { handleApiError } from "../../apps/web/src/server/api/responses";

describe("API error responses", () => {
  it("maps service conflicts to an explicit 409 response", async () => {
    const response = handleApiError(
      new ServiceConflictError("The last active owner cannot be demoted")
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONFLICT",
        message: "The last active owner cannot be demoted"
      }
    });
  });

  it("maps error codes across bundled service boundaries", async () => {
    const conflict = Object.assign(new Error("Protected task"), {
      code: "CONFLICT"
    });
    const forbidden = Object.assign(new Error("Unsafe URL"), {
      code: "FORBIDDEN"
    });

    expect(handleApiError(conflict).status).toBe(409);
    expect(handleApiError(forbidden).status).toBe(403);
  });
});
