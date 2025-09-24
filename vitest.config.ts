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
  esbuild: {
    jsx: "automatic", // <-- important
    jsxImportSource: "react", // <-- important
    // If you prefer classic runtime instead, comment the two lines above
    // and use: jsxInject: `import React from 'react'`,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/*": path.resolve(__dirname, "/*"),
      "server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
    },
  },
});
