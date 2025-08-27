import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    css: true, // lets RTL import CSS from shadcn
    include: ["**/*.{test,spec}.[jt]s?(x)"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/*": path.resolve(__dirname, "/*"),
      "server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
    },
  },
});
