"use server";

import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/withApi";
import { requireMember, requireUserId } from "@/lib/guards";
import type { TxItem } from "@/lib/middleware/transactions";

export type JarSummary = {
  id: string;
  name: string;
  currency: string;
};

export type JarGoalSummary = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ACHIEVED" | "CANCELLED";
  targetAmount: number;
  targetDate?: string | null;
  currentAmount: number;
  progress: number;
};

export type JarOverview = {
  summary: JarSummary;
  balance: number;
  incomeTotal: number;
  expenseTotal: number;
  transferTotal: number;
  transactionCount: number;
  recentTransactions: TxItem[];
  goals: JarGoalSummary[];
};

export async function getJarSummary(jarId: string): Promise<JarSummary> {
  const userId = await requireUserId();
  await requireMember(jarId, userId);

  const jar = await prisma.jar.findUnique({
    where: { id: jarId },
    select: { id: true, name: true, currency: true },
  });

  if (!jar) {
    throw new HttpError(404, "Jar not found");
  }

  return jar;
}

export async function getJarOverview(jarId: string): Promise<JarOverview> {
  const userId = await requireUserId();
  await requireMember(jarId, userId);

  const [
    jar,
    totalsByType,
    transactionCount,
    goalRows,
    goalContributionRows,
    recentRows,
  ] = await Promise.all([
    prisma.jar.findUnique({
      where: { id: jarId },
      select: { id: true, name: true, currency: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { jarId },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { jarId } }),
    prisma.goal.findMany({
      where: { jarId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        targetAmount: true,
        targetDate: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["goalId"],
      where: { jarId, goalId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { jarId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        date: true,
        amount: true,
        type: true,
        currency: true,
        note: true,
        Category: { select: { name: true } },
      },
    }),
  ]);

  if (!jar) {
    throw new HttpError(404, "Jar not found");
  }

  const totalsMap = {
    INCOME: 0,
    EXPENSE: 0,
    TRANSFER: 0,
  } as Record<"INCOME" | "EXPENSE" | "TRANSFER", number>;

  for (const row of totalsByType) {
    const value = Number(row._sum.amount ?? 0);
    totalsMap[row.type as keyof typeof totalsMap] = value;
  }

  const balance = totalsMap.INCOME - totalsMap.EXPENSE + totalsMap.TRANSFER;

  const contributions = goalContributionRows.reduce<Record<string, number>>(
    (acc, row) => {
      if (!row.goalId) return acc;
      acc[row.goalId] = Number(row._sum.amount ?? 0);
      return acc;
    },
    {}
  );

  const goals: JarGoalSummary[] = goalRows.map((goal) => {
    const target = Number(goal.targetAmount ?? 0);
    const current = contributions[goal.id] ?? 0;
    const progress = target > 0 ? Math.min(current / target, 1) : 0;

    return {
      id: goal.id,
      name: goal.name,
      status: goal.status,
      targetAmount: target,
      targetDate: goal.targetDate?.toISOString() ?? null,
      currentAmount: current,
      progress,
    };
  });

  const recentTransactions: TxItem[] = recentRows.map((row) => ({
    id: row.id,
    date: row.date.toISOString(),
    amount: Number(row.amount),
    type: row.type as "INCOME" | "EXPENSE" | "TRANSFER",
    currency: row.currency ?? null,
    note: row.note,
    category: row.Category ? { name: row.Category.name } : null,
    jar: null,
  }));

  return {
    summary: jar,
    balance,
    incomeTotal: totalsMap.INCOME,
    expenseTotal: totalsMap.EXPENSE,
    transferTotal: totalsMap.TRANSFER,
    transactionCount,
    recentTransactions,
    goals,
  };
}
