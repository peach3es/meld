// lib/middleware/transactions.ts
import { prisma } from "@/lib/prisma";
import { requireUserId, requireMember } from "@/lib/guards";

export type TxItem = {
  id: string;
  date: string; // ISO string for the client
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  currency?: string | null;
  note?: string | null;
  category?: { name: string | null } | null;
  jar?: { id: string; name: string | null } | null;
};

type TxRow = {
  id: string;
  date: Date;
  amount: unknown;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  currency: string | null;
  note: string | null;
  Category?: { name: string | null } | null;
  Jar?: { id: string; name: string | null } | null;
};

function normalizeTx(row: TxRow): TxItem {
  return {
    id: row.id,
    date: row.date.toISOString(),
    amount: Number(row.amount),
    type: row.type,
    currency: row.currency ?? null,
    note: row.note,
    category: row.Category ? { name: row.Category.name } : null,
    jar: row.Jar ? { id: row.Jar.id, name: row.Jar.name } : null,
  };
}

export async function getJarTransactions(
  jarId: string,
  limit = 50
): Promise<TxItem[]> {
  const userId = await requireUserId();
  await requireMember(jarId, userId);

  const rows = await prisma.transaction.findMany({
    where: { jarId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, Math.min(limit, 200)),
    select: {
      id: true,
      date: true,
      amount: true,
      type: true,
      currency: true,
      note: true,
      Category: { select: { name: true } },
    },
  });

  return rows.map(normalizeTx);
}

export async function getUserRecentTransactions(
  limit = 50
): Promise<TxItem[]> {
  const userId = await requireUserId();
  const memberships = await prisma.jarMember.findMany({
    where: { userId },
    select: { jarId: true },
  });

  if (!memberships.length) {
    return [];
  }

  const rows = await prisma.transaction.findMany({
    where: { jarId: { in: memberships.map((m) => m.jarId) } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, Math.min(limit, 200)),
    select: {
      id: true,
      date: true,
      amount: true,
      type: true,
      currency: true,
      note: true,
      Category: { select: { name: true } },
      Jar: { select: { id: true, name: true } },
    },
  });

  return rows.map(normalizeTx);
}
