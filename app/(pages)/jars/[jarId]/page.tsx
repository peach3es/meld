// app/jars/[jarId]/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import TransactionsTable from "@/components/transactions/Table";
import { getJarTransactions } from "@/lib/data/transactions";
import { HttpError } from "@/lib/withApi";

export const dynamic = "force-dynamic";

export default async function JarPage({
  params,
}: {
  params: Promise<{ jarId: string }>;
}) {
  const { jarId } = await params; // <-- await params per Next 15

  try {
    const items = await getJarTransactions(jarId, 50);
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
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
      redirect(`/login?redirect=/jars/${jarId}`);
    }
    throw e;
  }
}
