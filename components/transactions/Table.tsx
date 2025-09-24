"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { TxItem } from "@/lib/data/transactions";

export default function TransactionsTable({ items }: { items: TxItem[] }) {
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso)
    );
  const fmtMoney = (amt: number, cur?: string | null) => {
    const c = cur ?? "USD";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: c,
      }).format(amt);
    } catch {
      return `${amt.toFixed(2)} ${c}`;
    }
  };

  if (!items?.length) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No transactions yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px]">Date</TableHead>
            <TableHead className="min-w-[180px]">Note</TableHead>
            <TableHead className="w-[160px]">Category</TableHead>
            <TableHead className="w-[140px] text-right">Type</TableHead>
            <TableHead className="w-[160px] text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((tx) => {
            const signed =
              tx.type === "EXPENSE"
                ? -Math.abs(tx.amount)
                : tx.type === "INCOME"
                ? Math.abs(tx.amount)
                : tx.amount;
            return (
              <TableRow key={tx.id}>
                <TableCell>{fmtDate(tx.date)}</TableCell>
                <TableCell className="truncate">{tx.note ?? "—"}</TableCell>
                <TableCell className="truncate">
                  {tx.category?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {tx.type}
                  </span>
                </TableCell>
                <TableCell
                  className={`text-right ${
                    signed < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {fmtMoney(signed, tx.currency)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
