import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["spec/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["./spec/global-setup.ts"],
  },
});
