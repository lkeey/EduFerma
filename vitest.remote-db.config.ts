import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/smoke/**/*.test.ts"],
    globals: false,
    environment: "node",
    pool: "forks",
    fileParallelism: false
  },
  resolve: {
    alias: {
      "@": resolve(root, "apps/web/src"),
      "@eduferma/api-client": resolve(root, "packages/api-client/src/index.ts"),
      "@eduferma/config": resolve(root, "packages/config/src/index.ts"),
      "@eduferma/api-contract": resolve(root, "packages/api-contract/src/index.ts"),
      "@eduferma/core/platform": resolve(root, "packages/core/src/platform/index.ts"),
      "@eduferma/core/services": resolve(root, "packages/core/src/services/index.ts"),
      "@eduferma/core/telegram": resolve(root, "packages/core/src/telegram/index.ts"),
      "@eduferma/core": resolve(root, "packages/core/src/index.ts"),
      "@eduferma/db": resolve(root, "packages/db/src/index.ts"),
      "@eduferma/validators": resolve(root, "packages/validators/src/index.ts"),
      "drizzle-orm": resolve(root, "packages/db/node_modules/drizzle-orm")
    }
  }
});
