// app/jars/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { HttpError } from "@/lib/withApi";
import { getUserJars } from "@/lib/middleware/jars";

const DISPLAY_LOCALE = "en-CA";

export const dynamic = "force-dynamic";

export default async function JarsPage() {
  try {
    const jars = await getUserJars();

    if (!jars.length) {
      return (
        <main className="space-y-6 p-6">
          <header>
            <h1 className="text-3xl font-semibold">Your jars</h1>
            <p className="text-sm text-muted-foreground">
              Create a jar to start organising your finances.
            </p>
          </header>
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            You are not a member of any jars yet.
          </div>
        </main>
      );
    }

    return (
      <main className="space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-semibold">Your jars</h1>
          <p className="text-sm text-muted-foreground">
            Select a jar to view its overview and recent activity.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jars.map((jar) => {
            const currencyFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
              style: "currency",
              currency: jar.currency || "CAD",
            });
            const balance = currencyFormatter.format(jar.balance);
            const income = currencyFormatter.format(jar.incomeTotal);
            const expense = currencyFormatter.format(jar.expenseTotal);
            const created = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
              dateStyle: "medium",
            }).format(new Date(jar.createdAt));

            return (
              <Link
                key={jar.id}
                href={`/jars/${jar.id}`}
                className="group block rounded-lg border p-5 transition hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold group-hover:text-primary">
                    {jar.name}
                  </h2>
                  <span className="rounded-full border px-2 py-0.5 text-xs">
                    {jar.currency}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Created {created}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-medium">{balance}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Income</dt>
                    <dd className="font-medium text-emerald-600">{income}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Expenses</dt>
                    <dd className="font-medium text-red-600">{expense}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Transactions</dt>
                    <dd className="font-medium">
                      {jar.transactionCount.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect("/login?redirect=/jars");
    }
    throw error;
  }
}
