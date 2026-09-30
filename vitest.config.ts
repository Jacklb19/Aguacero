import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/tests/**/*.test.ts"],
    exclude: ["src/tests/contract/**"],
    environment: "node",
  },
});
