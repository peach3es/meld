// tests/api/jars.transactions.route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as prismaMod from "@/lib/prisma";
import { POST } from "@/app/api/jars/[jarId]/transactions/route";

// --- mock the async supabase server helper ---
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "u1" } }, error: null }),
    },
  }),
}));

// --- prisma mocks used by guards + route ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    // guards.ts uses findUnique on the composite key
    jarMember: { findUnique: vi.fn().mockResolvedValue({ userId: "u1" }) },

    // route.ts uses category.findFirst to validate entryType
    category: { findFirst: vi.fn() },

    // route.ts creates the transaction
    transaction: { create: vi.fn() },
  },
}));

const makeReq = (jarId: string, body: unknown) =>
  new NextRequest(`http://test/api/jars/${jarId}/transactions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/jars/:jarId/transactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path (EXPENSE)", async () => {
    (prismaMod.prisma.category.findFirst as any).mockResolvedValue({
      entryType: "EXPENSE",
    });
    (prismaMod.prisma.transaction.create as any).mockResolvedValue({
      id: "t1",
    });

    const res = await POST(
      makeReq("jar1", {
        date: new Date().toISOString(),
        amount: 12.34,
        type: "EXPENSE",
        categoryId: "cat1",
      }) as any,
      { params: { jarId: "jar1" } }
    );

    expect(res.status).toBe(201);
  });

  it("invalid category type for EXPENSE", async () => {
    (prismaMod.prisma.category.findFirst as any).mockResolvedValue({
      entryType: "INCOME",
    });

    const res = await POST(
      makeReq("jar1", {
        date: new Date().toISOString(),
        amount: 5,
        type: "EXPENSE",
        categoryId: "cat1",
      }) as any,
      { params: { jarId: "jar1" } }
    );

    expect(res.status).toBe(400);
  });

  it("unauthorized (no membership)", async () => {
    // make the guard fail by returning null
    (prismaMod.prisma.jarMember.findUnique as any).mockResolvedValue(null);

    const res = await POST(
      makeReq("jar1", {
        date: new Date().toISOString(),
        amount: 1,
        type: "INCOME",
        categoryId: "cat99",
      }) as any,
      { params: { jarId: "jar1" } }
    );

    expect(res.status).toBe(403);
  });
});
