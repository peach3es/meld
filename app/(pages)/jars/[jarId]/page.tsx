// app/jars/[jarId]/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import TransactionsTable from "@/components/transactions/transactionTable";
import { getJarTransactions } from "@/lib/middleware/transactions";
import { HttpError } from "@/lib/withApi";
import AddTransaction from "@/components/transactions/addTransaction";
import { getJarSummary } from "@/lib/middleware/jars";

export const dynamic = "force-dynamic";

export default async function JarPage({
  params,
}: {
  params: Promise<{ jarId: string }>;
}) {
  const { jarId } = await params; // <-- await params per Next 15

  try {
    const [jar, items] = await Promise.all([
      getJarSummary(jarId),
      getJarTransactions(jarId, 50),
    ]);
    return (
      <main className="p-6 space-y-6">
        <div className="flex justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{jar.name} Transactions</h1>
            <p className="text-sm text-muted-foreground">{jar.currency}</p>
          </div>
          <AddTransaction jarId={jarId} />
        </div>
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
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
      redirect(`/login?redirect=/jars/${jarId}`);
    }
    throw e;
  }
}
