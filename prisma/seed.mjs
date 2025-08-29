// prisma/seed.mjs
import {
  PrismaClient,
  Prisma,
  TransactionType,
  CategoryType,
  MemberRole,
} from "@prisma/client";
const prisma = new PrismaClient();

// Safety guard: only seed in dev
if (process.env.APP_ENV !== "dev") {
  console.error("Refusing to seed non-dev DB. Set APP_ENV=dev in .env.local");
  process.exit(1);
}

const DEMO_USER_ID = process.env.DEMO_USER_ID ?? "demo-user-id";
const JAR_NAME = process.env.DEMO_JAR_NAME ?? "Demo Jar";

const dec = (s) => new Prisma.Decimal(s);

async function main() {
  console.log("Seeding…");

  // 1) Jar
  let jar = await prisma.jar.findFirst({
    where: { name: JAR_NAME, createdBy: DEMO_USER_ID },
  });
  if (!jar) {
    jar = await prisma.jar.create({
      data: {
        name: JAR_NAME,
        createdBy: DEMO_USER_ID,
        currency: "CAD", // default anyway
      },
    });
  }

  // 2) Owner membership
  await prisma.jarMember.upsert({
    where: { jarId_userId: { jarId: jar.id, userId: DEMO_USER_ID } },
    update: { role: MemberRole.OWNER },
    create: {
      jarId: jar.id,
      userId: DEMO_USER_ID,
      role: MemberRole.OWNER,
    },
  });

  // 3) Categories
  async function ensureCategory(name, entryType) {
    const existing = await prisma.category.findFirst({
      where: { jarId: jar.id, name },
    });
    return (
      existing ??
      (await prisma.category.create({
        data: { jarId: jar.id, name, entryType },
      }))
    );
  }
  const groceries = await ensureCategory("Groceries", CategoryType.EXPENSE);
  const rent = await ensureCategory("Rent", CategoryType.EXPENSE);
  const salaryCat = await ensureCategory("Salary", CategoryType.INCOME);
  const savingsCat = await ensureCategory(
    "Emergency Fund",
    CategoryType.SAVINGS
  );

  // 4) Budgets (monthly caps)
  await prisma.budget.createMany({
    data: [
      { jarId: jar.id, categoryId: groceries.id, monthly: dec("500.00") },
      { jarId: jar.id, categoryId: rent.id, monthly: dec("1200.00") },
    ],
    skipDuplicates: true,
  });

  // 5) Goal (optional, to demo savings)
  const goal = await prisma.goal.upsert({
    where: { jarId_name: { jarId: jar.id, name: "Emergency Fund" } },
    update: {},
    create: {
      jarId: jar.id,
      name: "Emergency Fund",
      targetAmount: dec("3000.00"),
      targetDate: null,
    },
  });

  // 6) Transactions
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.transaction.createMany({
    data: [
      {
        id: undefined,
        jarId: jar.id,
        createdBy: DEMO_USER_ID,
        type: TransactionType.INCOME,
        amount: dec("3000.00"),
        currency: "CAD",
        categoryId: salaryCat.id,
        goalId: null,
        date: monthStart,
        note: "Monthly salary",
      },
      {
        jarId: jar.id,
        createdBy: DEMO_USER_ID,
        type: TransactionType.EXPENSE,
        amount: dec("1200.00"),
        currency: "CAD",
        categoryId: rent.id,
        goalId: null,
        date: monthStart,
        note: "Rent",
      },
      {
        jarId: jar.id,
        createdBy: DEMO_USER_ID,
        type: TransactionType.EXPENSE,
        amount: dec("120.34"),
        currency: "CAD",
        categoryId: groceries.id,
        goalId: null,
        date: new Date(
          now.getFullYear(),
          now.getMonth(),
          Math.min(5, now.getDate())
        ),
        note: "Groceries",
      },
      {
        jarId: jar.id,
        createdBy: DEMO_USER_ID,
        type: TransactionType.EXPENSE,
        amount: dec("100.00"),
        currency: "CAD",
        categoryId: savingsCat.id,
        goalId: goal.id, // contribution to goal
        date: new Date(
          now.getFullYear(),
          now.getMonth(),
          Math.min(10, now.getDate())
        ),
        note: "Emergency fund contribution",
      },
    ],
    skipDuplicates: true,
  });

  // 7) Example recurring (optional)
  await prisma.recurringTransaction.upsert({
    where: { id: "demo-salary-recurring" },
    update: {},
    create: {
      id: "demo-salary-recurring", // stable key for upsert
      jarId: jar.id,
      createdBy: DEMO_USER_ID,
      type: TransactionType.INCOME,
      amount: dec("3000.00"),
      currency: "CAD",
      categoryId: salaryCat.id,
      goalId: null,
      cadence: "MONTHLY",
      interval: 1,
      dayOfMonth: 1,
      startDate: monthStart,
      nextRunAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      note: "Recurring salary",
      active: true,
    },
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
