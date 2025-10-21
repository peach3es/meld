// app/transactions/page.tsx
import { redirect } from "next/navigation";
import TransactionsTable from "@/components/transactions/transactionTable";
import { getUserRecentTransactions } from "@/lib/middleware/transactions";
import { HttpError } from "@/lib/withApi";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  try {
    const items = await getUserRecentTransactions(50);

    return (
      <main className="space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-semibold">Recent transactions</h1>
          <p className="text-sm text-muted-foreground">
            Showing the latest {items.length} entries across all jars you have
            access to.
          </p>
        </header>

        <TransactionsTable items={items} showJarColumn />
      </main>
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect("/login?redirect=/transactions");
    }
    throw error;
  }
}
