import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: true, // lets RTL import CSS from shadcn
    include: ["**/*.{test,spec}.[jt]s?(x)"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/*": path.resolve(__dirname, "/*"),
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
});
