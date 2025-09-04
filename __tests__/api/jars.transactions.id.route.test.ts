// tests/api/jars.transactions.id.route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE as DEL } from "@/app/api/jars/[jarId]/transactions/[id]/route";
import { assertChildOwnership } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

// --- Mock only what hits external state ---
vi.mock("@/lib/guards", () => ({
  requireUserId: vi.fn().mockResolvedValue("user_123"),
  assertChildOwnership: vi.fn(), // we'll set returns per test
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      update: vi.fn().mockResolvedValue({ id: "tx_1", jarId: "jar_A" }),
      delete: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn().mockResolvedValue({ id: "tx_1", jarId: "jar_A" }),
    },
  },
}));

describe("item route /api/jars/:jarId/transactions/:id", () => {
  const ctx = { params: { jarId: "jar_A", id: "tx_1" } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH → 403 when transaction belongs to a different jar", async () => {
    (assertChildOwnership as any).mockResolvedValue("jar_OTHER"); // mismatch triggers 403
    const req = new Request("http://test", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memo: "update" }),
    });

    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
    const json: any = await res.json();
    expect(json.error.message).toMatch(/forbidden|cross-jar/i);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("DELETE → 403 when transaction belongs to a different jar", async () => {
    (assertChildOwnership as any).mockResolvedValue("jar_OTHER");
    const req = new Request("http://test", { method: "DELETE" });

    const res = await DEL(req, ctx);
    expect(res.status).toBe(403);
    const json: any = await res.json();
    expect(json.error.message).toMatch(/forbidden|cross-jar/i);
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });

  it("PATCH → 200 on same-jar update", async () => {
    (assertChildOwnership as any).mockResolvedValue("jar_A");
    const req = new Request("http://test", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memo: "ok" }),
    });

    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: "tx_1" },
      data: expect.objectContaining({ memo: "ok" }),
    });
  });

  it("DELETE → 204 on same-jar delete", async () => {
    (assertChildOwnership as any).mockResolvedValue("jar_A");
    const req = new Request("http://test", { method: "DELETE" });

    const res = await DEL(req, ctx);
    expect(res.status).toBe(204);
    expect(prisma.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx_1" } });
  });
});
