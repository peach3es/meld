// app/api/jars/[jarId]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireUserId, requireMember } from "@/lib/guards";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

type JarParams = Promise<{ jarId: string }>;

// ---------- validation ----------
const TxType = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

const ListQuery = z.object({
  from: z.coerce.date().optional(), // accepts ISO string, outputs Date
  to: z.coerce.date().optional(),
  type: TxType.optional(),
});

const CreateBody = z.object({
  // your Transaction fields
  date: z.coerce.date(), // ISO string -> Date
  amount: z.number().positive(),
  type: TxType,
  currency: z.string().length(3).optional(), // defaults to "CAD" in DB if omitted
  categoryId: z.string().optional().nullable(),
  note: z.string().max(500).optional(),
  goalId: z.string().optional().nullable(),
  transferCounterpartyJarId: z.string().optional().nullable(),
  metadata: z.any().optional(),
});

const toRes = (e: unknown) =>
  e instanceof HttpError
    ? NextResponse.json({ error: e.message }, { status: e.status })
    : (console.error(e),
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));

// ---------- GET /api/jars/:jarId/transactions ----------
export async function GET(req: NextRequest, ctx: { params: JarParams }) {
  try {
    const { jarId } = await ctx.params;
    const userId = await requireUserId(); // guard.ts
    await requireMember(jarId, userId); // guard.ts

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const q = ListQuery.parse(raw);

    const where: Prisma.TransactionWhereInput = { jarId: jarId };
    if (q.type) where.type = q.type;
    if (q.from || q.to) {
      where.date = {
        ...(q.from ? { gte: q.from } : {}),
        ...(q.to ? { lt: q.to } : {}),
      };
    }

    const rows = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { Category: true },
    });

    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    return toRes(e);
  }
}

// ---------- POST /api/jars/:jarId/transactions ----------
export async function POST(req: NextRequest, ctx: { params: JarParams }) {
  try {
    const { jarId } = await ctx.params;
    const userId = await requireUserId(); // guard.ts
    await requireMember(jarId, userId); // guard.ts

    const body = CreateBody.parse(await req.json());

    // business rules
    if (body.type === "TRANSFER") {
      if (body.categoryId)
        throw new HttpError(400, "Transfers cannot have categoryId.");
    } else {
      if (!body.categoryId)
        throw new HttpError(400, "categoryId is required for INCOME/EXPENSE.");

      const cat = await prisma.category.findFirst({
        where: { id: body.categoryId, jarId: jarId },
        select: { entryType: true },
      });
      if (!cat) throw new HttpError(400, "Category not found in this jar.");
      if (body.type === "EXPENSE" && cat.entryType !== "EXPENSE")
        throw new HttpError(400, "EXPENSE must use an EXPENSE category.");
      if (body.type === "INCOME" && cat.entryType !== "INCOME")
        throw new HttpError(400, "INCOME must use an INCOME category.");
    }

    const created = await prisma.transaction.create({
      data: {
        jarId: jarId,
        createdBy: userId,
        type: body.type,
        amount: new Prisma.Decimal(body.amount),
        currency: body.currency ?? undefined,
        categoryId: body.categoryId ?? null,
        goalId: body.goalId ?? null,
        date: body.date,
        note: body.note ?? null,
        transferCounterpartyJarId: body.transferCounterpartyJarId ?? null,
        metadata: body.metadata ?? undefined,
      },
      include: { Category: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return toRes(e);
  }
}
