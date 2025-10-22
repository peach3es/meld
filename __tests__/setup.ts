// tests/setup.ts
import { expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "vitest-axe";

expect.extend({ toHaveNoViolations });

// axe-core relies on canvas for color contrast. Provide a minimal stub so tests
// don't error on jsdom.
if (typeof HTMLCanvasElement !== "undefined") {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: vi.fn(() => ({
      measureText: () => ({ width: 0 }),
    })),
  });
}

if (typeof HTMLElement !== "undefined") {
  const proto = HTMLElement.prototype as any;
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
    proto.setPointerCapture = () => {};
    proto.releasePointerCapture = () => {};
  }
}
