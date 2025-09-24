import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TransactionsTable from "@/components/transactions/Table";
import type { TxItem } from "@/lib/data/transactions";

const row = (o: Partial<TxItem>): TxItem => ({
  id: "t1",
  date: "2025-01-01T00:00:00.000Z",
  amount: 123.45,
  type: "INCOME",
  currency: "USD",
  note: "Salary",
  category: { name: "Work" },
  ...o,
});

describe("<TransactionsTable />", () => {
  it("renders empty state", () => {
    render(<TransactionsTable items={[]} />);
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });

  it("renders rows with formatted columns", () => {
    const items: TxItem[] = [
      row({ id: "1", type: "INCOME", amount: 150 }),
      row({
        id: "2",
        type: "EXPENSE",
        amount: 25.5,
        note: "Coffee",
        category: { name: "Food" },
      }),
      row({ id: "3", type: "TRANSFER", amount: 10, note: null }),
    ];
    render(<TransactionsTable items={items} />);

    // header + 3 body rows
    expect(screen.getAllByRole("row")).toHaveLength(4);

    // basic cells
    expect(screen.getByText(/coffee/i)).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();

    // amount formatting (locale varies; match loosely)
    expect(screen.getByText(/\$?150(\.00)?/)).toBeInTheDocument();
    expect(screen.getByText(/-?\$?25(\.5+)?/)).toBeInTheDocument();
  });

  it("applies red for expenses and green for income", () => {
    const items: TxItem[] = [
      row({ id: "in", type: "INCOME", amount: 1 }),
      row({ id: "ex", type: "EXPENSE", amount: 1 }),
    ];
    const { container } = render(<TransactionsTable items={items} />);
    const cells = container.querySelectorAll("td.text-right");
    expect(
      [...cells].some((c) => c.className.includes("text-emerald-600"))
    ).toBe(true);
    expect([...cells].some((c) => c.className.includes("text-red-600"))).toBe(
      true
    );
  });
});
