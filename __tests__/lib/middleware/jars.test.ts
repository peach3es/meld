import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  jar: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  jarMember: {
    findMany: vi.fn(),
  },
  transaction: {
    groupBy: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  goal: {
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
  getJarOverview,
  getJarSummary,
  getUserJars,
} from "@/lib/middleware/jars";
import { HttpError } from "@/lib/withApi";

const decimalLike = (value: number) =>
  ({
    valueOf: () => value,
    toString: () => value.toString(),
  } as unknown as number);

describe("lib/middleware/jars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getJarSummary", () => {
    it("returns metadata for the jar when the user is a member", async () => {
      prismaMocks.jar.findUnique.mockResolvedValueOnce({
        id: "jar-1",
        name: "House Fund",
        currency: "CAD",
      });

      const result = await getJarSummary("jar-1");

      expect(result).toEqual({
        id: "jar-1",
        name: "House Fund",
        currency: "CAD",
      });
      expect(guardMocks.requireMember).toHaveBeenCalledWith("jar-1", "user-1");
    });

    it("throws HttpError when the jar does not exist", async () => {
      prismaMocks.jar.findUnique.mockResolvedValueOnce(null);
      await expect(getJarSummary("missing")).rejects.toBeInstanceOf(HttpError);
    });
  });

  describe("getJarOverview", () => {
    beforeEach(() => {
      prismaMocks.jar.findUnique.mockResolvedValue({
        id: "jar-1",
        name: "House Fund",
        currency: "CAD",
      });
      prismaMocks.transaction.groupBy.mockResolvedValueOnce([
        { type: "INCOME", _sum: { amount: decimalLike(100) } },
        { type: "EXPENSE", _sum: { amount: decimalLike(40) } },
        { type: "TRANSFER", _sum: { amount: decimalLike(5) } },
      ]);
      prismaMocks.transaction.groupBy.mockResolvedValueOnce([
        { goalId: "goal-1", _sum: { amount: decimalLike(10) } },
      ]);
      prismaMocks.transaction.count.mockResolvedValueOnce(7);
      prismaMocks.goal.findMany.mockResolvedValueOnce([
        {
          id: "goal-1",
          name: "Emergency Fund",
          status: "ACTIVE",
          targetAmount: decimalLike(80),
          targetDate: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
      prismaMocks.transaction.findMany.mockResolvedValueOnce([
        {
          id: "tx-1",
          date: new Date("2025-05-10T12:00:00.000Z"),
          amount: decimalLike(35),
          type: "INCOME",
          currency: "CAD",
          note: "Paycheque",
          Category: { name: "Salary" },
        },
      ]);
    });

    it("aggregates totals, recent transactions, and goals", async () => {
      const overview = await getJarOverview("jar-1");

      expect(overview.summary.name).toBe("House Fund");
      expect(overview.balance).toBeCloseTo(65);
      expect(overview.incomeTotal).toBe(100);
      expect(overview.expenseTotal).toBe(40);
      expect(overview.transactionCount).toBe(7);

      expect(overview.recentTransactions).toEqual([
        expect.objectContaining({
          id: "tx-1",
          note: "Paycheque",
          category: { name: "Salary" },
        }),
      ]);

      expect(overview.goals).toEqual([
        expect.objectContaining({
          id: "goal-1",
          name: "Emergency Fund",
          currentAmount: 10,
          progress: 0.125,
        }),
      ]);
    });
  });

  describe("getUserJars", () => {
    beforeEach(() => {
      prismaMocks.jarMember.findMany.mockResolvedValue([
        { jarId: "jar-1" },
        { jarId: "jar-2" },
      ]);
      prismaMocks.jar.findMany.mockResolvedValue([
        {
          id: "jar-1",
          name: "House Fund",
          currency: "CAD",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        },
        {
          id: "jar-2",
          name: "Travel",
          currency: "CAD",
          createdAt: new Date("2024-02-01T00:00:00.000Z"),
        },
      ]);
      prismaMocks.transaction.groupBy
        .mockResolvedValueOnce([
          {
            jarId: "jar-1",
            type: "INCOME",
            _sum: { amount: decimalLike(100) },
          },
          {
            jarId: "jar-1",
            type: "EXPENSE",
            _sum: { amount: decimalLike(25) },
          },
          {
            jarId: "jar-2",
            type: "INCOME",
            _sum: { amount: decimalLike(40) },
          },
        ])
        .mockResolvedValueOnce([
          { jarId: "jar-1", _count: { _all: 5 } },
          { jarId: "jar-2", _count: { _all: 2 } },
        ]);
    });

    it("returns aggregated balances for each jar the user belongs to", async () => {
      const jars = await getUserJars();

      expect(jars).toEqual([
        expect.objectContaining({
          id: "jar-1",
          balance: 75,
          transactionCount: 5,
        }),
        expect.objectContaining({
          id: "jar-2",
          balance: 40,
          transactionCount: 2,
        }),
      ]);
    });

    it("returns an empty array when the user has no jars", async () => {
      prismaMocks.jarMember.findMany.mockResolvedValueOnce([]);
      const jars = await getUserJars();
      expect(jars).toEqual([]);
    });
  });
});
