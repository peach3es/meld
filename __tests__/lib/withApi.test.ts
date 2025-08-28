// tests/lib/withApi.test.ts
import { describe, it, expect } from "vitest";
import { withApi, HttpError } from "../../lib/withApi";

describe("withApi -> HttpError mapping", () => {
  it("returns consistent JSON error for 400/401/403", async () => {
    for (const status of [400, 401, 403] as const) {
      const wrapped = withApi(async () => {
        throw new HttpError(status, `e${status}`, `C${status}`);
      });

      const res = await wrapped(new Request("http://test"));
      expect(res.status).toBe(status);

      const body = (await res.json()) as any;
      expect(body).toHaveProperty("error");
      expect(body.error.message).toBe(`e${status}`);
      expect(body.error.status).toBe(status);
      expect(body.error.code).toBe(`C${status}`);
    }
  });
});
