// app/jars/[jarId]/page.tsx
import { redirect } from "next/navigation";
import TransactionsTable from "@/components/transactions/transactionTable";
import { HttpError } from "@/lib/withApi";
import AddTransaction from "@/components/transactions/addTransaction";
import { getJarOverview } from "@/lib/middleware/jars";

export const dynamic = "force-dynamic";
const DISPLAY_LOCALE = "en-CA";

function MetricCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

export default async function JarPage({
  params,
}: {
  params: Promise<{ jarId: string }>;
}) {
  const { jarId } = await params; // <-- await params per Next 15

  try {
    const overview = await getJarOverview(jarId);
    const currencyFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
      style: "currency",
      currency: overview.summary.currency || "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      dateStyle: "medium",
    });

    return (
      <main className="space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{overview.summary.name}</h1>
            {/* <p className="text-sm text-muted-foreground">
                            {overview.summary.currency} • {currencyFormatter.format(overview.balance)} current balance
                        </p> */}
          </div>
          <AddTransaction jarId={jarId} />
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Current balance"
            value={currencyFormatter.format(overview.balance)}
          />
          <MetricCard
            label="Total income"
            value={currencyFormatter.format(overview.incomeTotal)}
          />
          <MetricCard
            label="Total expenses"
            value={currencyFormatter.format(overview.expenseTotal)}
            valueClassName="text-red-600"
          />
          <MetricCard
            label="Transactions recorded"
            value={overview.transactionCount.toLocaleString()}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent activity</h2>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Last {overview.recentTransactions.length} entries
              </span>
            </div>
            <TransactionsTable items={overview.recentTransactions} />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Goals</h2>
            {overview.goals.length ? (
              <div className="space-y-4">
                {overview.goals.map((goal) => {
                  const formattedTarget = currencyFormatter.format(
                    goal.targetAmount
                  );
                  const formattedCurrent = currencyFormatter.format(
                    goal.currentAmount
                  );
                  const percent = Math.round(goal.progress * 100);
                  return (
                    <div
                      key={goal.id}
                      className="space-y-2 rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{goal.name}</p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {goal.status.toLowerCase()}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          {formattedCurrent} / {formattedTarget}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary transition-[width]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{percent}% complete</span>
                        {goal.targetDate ? (
                          <span>
                            Target{" "}
                            {dateFormatter.format(new Date(goal.targetDate))}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No goals yet. Create a savings goal to track progress.
              </div>
            )}
          </div>
        </section>
      </main>
    );
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
      redirect(`/login?redirect=/jars/${jarId}`);
    }
    throw e;
  }
}
