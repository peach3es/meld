// vitest.config.ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"], // load jest-dom here (see below)
    css: true, // allow importing CSS (e.g., shadcn)
    include: ["**/*.{test,spec}.[jt]s?(x)"],
  },

  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      // Use project root; if you have a /src layout, change to resolve(__dirname, "src")
      "@": resolve(__dirname, "."),
      // Handy mocks for Next in tests (create these files)
      "server-only": resolve(__dirname, "__tests__/mocks/server-only.ts"),
      "next/navigation": resolve(
        __dirname,
        "__tests__/mocks/next-navigation.ts"
      ),
      "next/link": resolve(__dirname, "__tests__/mocks/next-link.tsx"),
      "next/image": resolve(__dirname, "__tests__/mocks/next-image.tsx"),
    },
  },
});
