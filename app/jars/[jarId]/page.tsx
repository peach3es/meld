import { Suspense } from "react";
import { getJarTransactions } from "@/lib/data/transactions";
import TransactionsTable from "@/components/transactions/Table";

export const dynamic = "force-dynamic"; // or: export const revalidate = 0;

export default async function JarPage({
  params,
  searchParams,
}: {
  params: { jarId: string };
  searchParams: { limit?: string };
}) {
  const limit = Number(searchParams?.limit ?? 50) || 50;

  const items = await getJarTransactions(params.jarId, limit);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <Suspense
        fallback={
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <TransactionsTable items={items} />
      </Suspense>
    </main>
  );
}
