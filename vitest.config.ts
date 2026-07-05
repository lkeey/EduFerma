import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globals: false,
    environment: "node"
  },
  resolve: {
    alias: {
      "@eduferma/config": resolve(root, "packages/config/src/index.ts"),
      "@eduferma/api-contract": resolve(root, "packages/api-contract/src/index.ts"),
      "@eduferma/core": resolve(root, "packages/core/src/index.ts"),
      "@eduferma/db": resolve(root, "packages/db/src/index.ts"),
      "@eduferma/validators": resolve(root, "packages/validators/src/index.ts")
    }
  }
});
