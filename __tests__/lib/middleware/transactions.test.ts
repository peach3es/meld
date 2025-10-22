import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: {
    findMany: vi.fn(),
  },
  jarMember: {
    findMany: vi.fn(),
  },
}));

const guardMocks = vi.hoisted(() => ({
  requireUserId: vi.fn().mockResolvedValue("user-1"),
  requireMember: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMocks,
}));

vi.mock("@/lib/guards", () => guardMocks);

import {
  getJarTransactions,
  getUserRecentTransactions,
} from "@/lib/middleware/transactions";

const decimalLike = (value: number) =>
  ({
    valueOf: () => value,
    toString: () => value.toString(),
  } as unknown as number);

describe("lib/middleware/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getJarTransactions", () => {
    it("returns normalized transactions for the jar", async () => {
      const date = new Date("2025-01-02T03:04:05.000Z");
      prismaMocks.transaction.findMany.mockResolvedValueOnce([
        {
          id: "tx-1",
          date,
          amount: decimalLike(42.5),
          type: "INCOME",
          currency: "CAD",
          note: "Payday",
          Category: { name: "Salary" },
        },
      ]);

      const items = await getJarTransactions("jar-1", 50);

      expect(items).toEqual([
        {
          id: "tx-1",
          date: date.toISOString(),
          amount: 42.5,
          type: "INCOME",
          currency: "CAD",
          note: "Payday",
          category: { name: "Salary" },
          jar: null,
        },
      ]);
      expect(guardMocks.requireMember).toHaveBeenCalledWith("jar-1", "user-1");
      expect(prismaMocks.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jarId: "jar-1" },
          take: 50,
        })
      );
    });
  });

  describe("getUserRecentTransactions", () => {
    it("returns an empty array when the user has no jar memberships", async () => {
      prismaMocks.jarMember.findMany.mockResolvedValueOnce([]);
      const items = await getUserRecentTransactions();
      expect(items).toEqual([]);
      expect(prismaMocks.transaction.findMany).not.toHaveBeenCalled();
    });

    it("returns the latest transactions across all jars", async () => {
      prismaMocks.jarMember.findMany.mockResolvedValueOnce([
        { jarId: "jar-1" },
      ]);
      const date = new Date("2025-02-01T00:00:00.000Z");
      prismaMocks.transaction.findMany.mockResolvedValueOnce([
        {
          id: "tx-99",
          date,
          amount: decimalLike(12),
          type: "EXPENSE",
          currency: "CAD",
          note: "Snack",
          Category: { name: "Food" },
          Jar: { id: "jar-1", name: "Everyday" },
        },
      ]);

      const items = await getUserRecentTransactions(10);

      expect(prismaMocks.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jarId: { in: ["jar-1"] } },
          take: 10,
        })
      );
      expect(items).toEqual([
        {
          id: "tx-99",
          date: date.toISOString(),
          amount: 12,
          type: "EXPENSE",
          currency: "CAD",
          note: "Snack",
          category: { name: "Food" },
          jar: { id: "jar-1", name: "Everyday" },
        },
      ]);
    });
  });
});
