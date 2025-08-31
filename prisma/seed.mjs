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

const DEMO_USER_ID = process.env.DEMO_USER_ID;
const OPERATING_JAR_NAME = process.env.OPERATING_JAR_NAME;
const SAVINGS_JAR_NAME = process.env.DEMO_JAR_NAME;

const dec = (s) => new Prisma.Decimal(s);

async function ensureJar(name) {
  const existing = await prisma.jar.findFirst({
    where: { name, createdBy: DEMO_USER_ID },
  });
  if (existing) return existing;
  return prisma.jar.create({
    data: { name, createdBy: DEMO_USER_ID, currency: "CAD" },
  });
}

async function ensureMember(jarId, role = MemberRole.OWNER) {
  await prisma.jarMember.upsert({
    where: { jarId_userId: { jarId, userId: DEMO_USER_ID } },
    update: { role },
    create: { jarId, userId: DEMO_USER_ID, role },
  });
}

async function ensureCategory(jarId, name, entryType) {
  const existing = await prisma.category.findFirst({
    where: { jarId, name },
  });
  if (existing) return existing;
  return prisma.category.create({
    data: { jarId, name, entryType },
  });
}

const upsertTxn = (id, data) =>
  prisma.transaction.upsert({
    where: { id },
    update: {},
    create: { id, ...data },
  });

async function main() {
  console.log("Seeding…");

  // 1) Jars: Operating (spend) + Savings (goal)
  const operating = await ensureJar(OPERATING_JAR_NAME);
  const savings = await ensureJar(SAVINGS_JAR_NAME);

  // 2) Owner memberships
  await Promise.all([ensureMember(operating.id), ensureMember(savings.id)]);

  // 3) Categories (for Operating jar)
  const groceries = await ensureCategory(
    operating.id,
    "Groceries",
    CategoryType.EXPENSE
  );
  const rent = await ensureCategory(operating.id, "Rent", CategoryType.EXPENSE);
  const salaryCat = await ensureCategory(
    operating.id,
    "Salary",
    CategoryType.INCOME
  );

  // 4) Budgets on Operating jar
  await prisma.budget.createMany({
    data: [
      { jarId: operating.id, categoryId: groceries.id, monthly: dec("500.00") },
      { jarId: operating.id, categoryId: rent.id, monthly: dec("1200.00") },
    ],
    skipDuplicates: true,
  });

  // 5) Goal lives in the Savings jar
  const goal = await prisma.goal.upsert({
    where: { jarId_name: { jarId: savings.id, name: "Emergency Fund" } },
    update: {},
    create: {
      jarId: savings.id,
      name: "Emergency Fund",
      targetAmount: dec("3000.00"),
      targetDate: null,
    },
  });

  // 6) Transactions (income/expenses in Operating)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Income into Operating
  await upsertTxn("seed-income-salary", {
    jarId: operating.id,
    createdBy: DEMO_USER_ID,
    type: TransactionType.INCOME,
    amount: dec("3000.00"),
    currency: "CAD",
    categoryId: salaryCat.id,
    date: monthStart,
    note: "Monthly salary",
  });

  // Expenses from Operating
  await upsertTxn("seed-expense-rent", {
    jarId: operating.id,
    createdBy: DEMO_USER_ID,
    type: TransactionType.EXPENSE,
    amount: dec("1200.00"),
    currency: "CAD",
    categoryId: rent.id,
    date: monthStart,
    note: "Rent",
  });

  await upsertTxn("seed-expense-groceries", {
    jarId: operating.id,
    createdBy: DEMO_USER_ID,
    type: TransactionType.EXPENSE,
    amount: dec("120.34"),
    currency: "CAD",
    categoryId: groceries.id,
    date: new Date(
      now.getFullYear(),
      now.getMonth(),
      Math.min(5, now.getDate())
    ),
    note: "Groceries",
  });

  // 7) Transfer: Operating -> Savings (single row recorded on source jar)
  await upsertTxn("seed-transfer-operating-to-savings", {
    jarId: operating.id,
    createdBy: DEMO_USER_ID,
    type: TransactionType.TRANSFER,
    amount: dec("100.00"),
    currency: "CAD",
    transferCounterpartyJarId: savings.id,
    goalId: goal.id,
    date: new Date(
      now.getFullYear(),
      now.getMonth(),
      Math.min(10, now.getDate())
    ),
    note: "Move to Emergency Fund",
  });

  // 8) Example recurring INCOME on Operating
  await prisma.recurringTransaction.upsert({
    where: { id: "demo-salary-recurring" },
    update: {},
    create: {
      id: "demo-salary-recurring",
      jarId: operating.id,
      createdBy: DEMO_USER_ID,
      type: TransactionType.INCOME,
      amount: dec("3000.00"),
      currency: "CAD",
      categoryId: salaryCat.id,
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
