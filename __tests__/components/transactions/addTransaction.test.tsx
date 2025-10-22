import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AddTransaction from "@/components/transactions/addTransaction";

const categoriesResponse = [
  { id: "cat-1", name: "Groceries", entryType: "EXPENSE" },
];

const createFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/categories")) {
      return {
        ok: true,
        json: async () => categoriesResponse,
      } as Response;
    }
    if (url.includes("/transactions")) {
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    }
    throw new Error(`Unhandled fetch: ${url}`);
  });

describe("<AddTransaction />", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("opens the dialog and loads categories", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddTransaction jarId="jar-1" />);

    await userEvent.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/categories"),
        expect.objectContaining({ method: "GET" })
      );
    });

    expect(
      screen.getByRole("heading", { name: /add transaction/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("shows a validation message when category is missing", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AddTransaction jarId="jar-1" />);

    await userEvent.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/categories"),
        expect.objectContaining({ method: "GET" })
      );
    });

    await userEvent.type(screen.getByLabelText(/amount/i), "10");
    await userEvent.click(
      screen.getByRole("button", { name: /save transaction/i })
    );

    const errorMessage = await screen.findByText(/select a category/i, {
      selector: "p",
    });
    expect(errorMessage).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        typeof url === "string" && url.includes("/transactions")
      )
    ).toHaveLength(0);
  });
});
