// lib/data/transactions.ts
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
};

export async function getJarTransactions(
  jarId: string,
  limit = 50
): Promise<TxItem[]> {
  const userId = await requireUserId();
  await requireMember(jarId, userId);

  const rows = await prisma.transaction.findMany({
    where: { jarId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }], // drop createdAt if you don't have it
    take: Math.max(1, Math.min(limit, 200)),
    select: {
      id: true,
      date: true, // Date -> string
      amount: true, // Decimal -> number
      type: true, // Prisma enum -> string union below
      currency: true,
      note: true,
      // Use the relation field name *you actually have*:
      // If it's `Category` (capital C), keep this; if it's `category`, change it.
      Category: { select: { name: true } },
    },
  });

  // normalize types for the client
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    amount: Number(r.amount), // Prisma.Decimal -> number
    type: r.type as "INCOME" | "EXPENSE" | "TRANSFER",
    currency: r.currency ?? null,
    note: r.note,
    category: r.Category ? { name: r.Category.name } : null, // or r.category if that's your field
  }));
}
