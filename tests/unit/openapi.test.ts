import { describe, expect, it } from "vitest";
import { openApiDocument, routeDefinitions } from "@eduferma/api-contract";

describe("openapi contract", () => {
  it("documents every registered route and method", () => {
    for (const route of routeDefinitions) {
      expect(openApiDocument.paths[route.path]?.[route.method]).toBeTruthy();
    }
  });

  it("uses unique operation ids", () => {
    const operationIds = routeDefinitions.map((route) => route.operationId);
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  it("marks protected endpoints with security", () => {
    for (const route of routeDefinitions.filter((item) => !item.public)) {
      expect(openApiDocument.paths[route.path]?.[route.method]?.security).toBeTruthy();
    }
  });
});
