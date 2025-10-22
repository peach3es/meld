import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TransactionsTable from "@/components/transactions/transactionTable";
import type { TxItem } from "@/lib/middleware/transactions";

const baseTx = (overrides: Partial<TxItem> = {}): TxItem => ({
  id: "tx-1",
  date: "2025-01-01T00:00:00.000Z",
  amount: 25.5,
  type: "EXPENSE",
  currency: "CAD",
  note: "Coffee",
  category: { name: "Food" },
  jar: { id: "jar-1", name: "Everyday" },
  ...overrides,
});

describe("<TransactionsTable />", () => {
  it("renders an empty state when there are no transactions", () => {
    render(<TransactionsTable items={[]} />);
    expect(
      screen.getByText(/no transactions yet/i)
    ).toBeInTheDocument();
  });

  it("displays transaction details including jar information", () => {
    const tx = baseTx();
    render(<TransactionsTable items={[tx]} showJarColumn />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);

    const row = within(rows[1]);
    expect(row.getByText("Everyday")).toBeInTheDocument();
    expect(row.getByText("Coffee")).toBeInTheDocument();
    expect(row.getByText("Food")).toBeInTheDocument();
    expect(row.getByText("EXPENSE")).toBeInTheDocument();

    const expectedAmount = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(-tx.amount);
    expect(row.getByText(expectedAmount)).toBeInTheDocument();

    const expectedDate = new Intl.DateTimeFormat("en-CA", {
      dateStyle: "medium",
    }).format(new Date(tx.date));
    expect(row.getByText(expectedDate)).toBeInTheDocument();
  });

  it("omits the jar column when showJarColumn is false", () => {
    render(<TransactionsTable items={[baseTx({ jar: null })]} />);
    expect(screen.queryByText("Everyday")).not.toBeInTheDocument();
    expect(screen.getByText(/coffee/i)).toBeInTheDocument();
  });
});
