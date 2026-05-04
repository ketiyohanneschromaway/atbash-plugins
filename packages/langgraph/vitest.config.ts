import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@atbash/sdk": path.resolve(__dirname, "../../test-support/mock-atbash-sdk.ts"),
    },
  },
});
