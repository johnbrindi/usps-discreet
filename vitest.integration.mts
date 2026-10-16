import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration tests run against a real, disposable PostgreSQL database — never your live one.
 *   INTEGRATION_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/tracktest npm run test:integration
 * Apply migrations to it first (DATABASE_URL=… npx prisma migrate deploy).
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.INTEGRATION_DATABASE_URL ?? "",
      BETTER_AUTH_SECRET: "integration-test-secret-at-least-32-chars",
    },
  },
});
