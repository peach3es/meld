import { describe, it, expect, vi, beforeEach } from "vitest";

// --- mock prisma BEFORE importing the SUT ---
// We keep prisma mocked but cast its return values to `any[]` to avoid Prisma type friction in tests.
vi.mock("@/lib/prisma", () => {
  const findMany = vi.fn();
  return { prisma: { transaction: { findMany } } };
});

// --- mock guards BEFORE importing the SUT ---
vi.mock("@/lib/guards", () => ({
  requireUserId: vi.fn().mockResolvedValue("u1"),
  requireMember: vi.fn().mockResolvedValue(undefined),
}));

// import mocked deps to control/inspect them
import { prisma } from "@/lib/prisma";
import { requireUserId, requireMember } from "@/lib/guards";

// import the function under test (after mocks)
import { getJarTransactions, type TxItem } from "@/lib/data/transactions";

// Decimal-like object that `Number()` can read (our code does `Number(r.amount)`)
class DecimalLike {
  constructor(private v: number) {}
  valueOf() {
    return this.v;
  }
  toString() {
    return String(this.v);
  }
}

describe("getJarTransactions", () => {
  const mockFindMany = vi.mocked((prisma as any).transaction.findMany);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps prisma rows to TxItem and calls guards", async () => {
    const date = new Date("2025-01-02T03:04:05.000Z");

    // Cast to any[] so TS doesn't require Prisma.Decimal or non-null currency
    mockFindMany.mockResolvedValueOnce([
      {
        id: "t1",
        date,
        amount: new DecimalLike(12.34) as any,
        type: "INCOME",
        currency: "CAD",
        note: "hello",
        Category: { name: "Food" },
      },
    ] as any[]);

    const items = await getJarTransactions("jarA", 50);
    const expected: TxItem[] = [
      {
        id: "t1",
        date: "2025-01-02T03:04:05.000Z",
        amount: 12.34,
        type: "INCOME",
        currency: "CAD",
        note: "hello",
        category: { name: "Food" },
      },
    ];
    expect(items).toEqual(expected);

    expect(requireUserId).toHaveBeenCalledTimes(1);
    expect(requireMember).toHaveBeenCalledWith("jarA", "u1");

    const args = mockFindMany.mock.calls[0]![0]!;
    expect(args.where).toEqual({ jarId: "jarA" });
    expect(args.orderBy).toEqual([{ date: "desc" }, { createdAt: "desc" }]);
    expect(args.take).toBe(50);
    expect(args.select).toMatchObject({
      id: true,
      date: true,
      amount: true,
      type: true,
      currency: true,
      note: true,
      Category: { select: { name: true } },
    });
  });

  it("caps take between 1 and 200 & maps nulls", async () => {
    mockFindMany.mockResolvedValueOnce([] as any[]);
    await getJarTransactions("j", 0);
    const args1 = mockFindMany.mock.calls.at(-1)![0]!;
    expect(args1.take).toBe(1);

    mockFindMany.mockResolvedValueOnce([] as any[]);
    await getJarTransactions("j", 999);
    const args2 = mockFindMany.mock.calls.at(-1)![0]!;
    expect(args2.take).toBe(200);

    const date = new Date("2025-06-01T00:00:00.000Z");
    mockFindMany.mockResolvedValueOnce([
      {
        id: "t2",
        date,
        amount: new DecimalLike(0) as any,
        type: "TRANSFER",
        currency: null as any, // allow null in mock; your mapper converts to null in DTO
        note: null,
        Category: null,
      },
    ] as any[]);

    const items = await getJarTransactions("jarB", 1);
    expect(items).toEqual([
      {
        id: "t2",
        date: "2025-06-01T00:00:00.000Z",
        amount: 0,
        type: "TRANSFER",
        currency: null,
        note: null,
        category: null,
      },
    ]);
  });
});
