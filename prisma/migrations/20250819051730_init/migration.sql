-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."CategoryType" AS ENUM ('INCOME', 'EXPENSE', 'SAVINGS');

-- CreateEnum
CREATE TYPE "public"."GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Recurrence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "public"."Jar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JarMember" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JarMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entryType" "public"."CategoryType" NOT NULL DEFAULT 'EXPENSE',
    "icon" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Budget" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "monthly" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "categoryId" TEXT,
    "goalId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "transferCounterpartyJarId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" "public"."GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invite" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringTransaction" (
    "id" TEXT NOT NULL,
    "jarId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CAD',
    "categoryId" TEXT,
    "goalId" TEXT,
    "cadence" "public"."Recurrence" NOT NULL DEFAULT 'MONTHLY',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "weekday" INTEGER,
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Jar_createdBy_idx" ON "public"."Jar"("createdBy");

-- CreateIndex
CREATE INDEX "JarMember_userId_idx" ON "public"."JarMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JarMember_jarId_userId_key" ON "public"."JarMember"("jarId", "userId");

-- CreateIndex
CREATE INDEX "Category_jarId_entryType_isArchived_idx" ON "public"."Category"("jarId", "entryType", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Category_jarId_name_key" ON "public"."Category"("jarId", "name");

-- CreateIndex
CREATE INDEX "Budget_jarId_idx" ON "public"."Budget"("jarId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_jarId_categoryId_key" ON "public"."Budget"("jarId", "categoryId");

-- CreateIndex
CREATE INDEX "Transaction_jarId_date_idx" ON "public"."Transaction"("jarId", "date");

-- CreateIndex
CREATE INDEX "Transaction_jarId_categoryId_idx" ON "public"."Transaction"("jarId", "categoryId");

-- CreateIndex
CREATE INDEX "Transaction_createdBy_idx" ON "public"."Transaction"("createdBy");

-- CreateIndex
CREATE INDEX "Transaction_jarId_type_date_idx" ON "public"."Transaction"("jarId", "type", "date");

-- CreateIndex
CREATE INDEX "Goal_jarId_status_idx" ON "public"."Goal"("jarId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_jarId_name_key" ON "public"."Goal"("jarId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "public"."Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_jarId_email_idx" ON "public"."Invite"("jarId", "email");

-- CreateIndex
CREATE INDEX "RecurringTransaction_jarId_active_nextRunAt_idx" ON "public"."RecurringTransaction"("jarId", "active", "nextRunAt");

-- AddForeignKey
ALTER TABLE "public"."JarMember" ADD CONSTRAINT "JarMember_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_transferCounterpartyJarId_fkey" FOREIGN KEY ("transferCounterpartyJarId") REFERENCES "public"."Jar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "public"."Jar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
