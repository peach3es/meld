// app/api/jars/[jarId]/transactions/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, requireMember } from "@/lib/guards";
import { HttpError, withApi } from "@/lib/withApi";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

type JarParams = Promise<{ jarId: string }>;

// ---------- validation ----------
const TxType = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

const ListQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: TxType.optional(),
});

const CreateBody = z.object({
  date: z.coerce.date(),
  amount: z.number().positive(),
  type: TxType,
  currency: z.string().length(3).optional(),
  categoryId: z.string().optional().nullable(),
  note: z.string().max(500).optional(),
  goalId: z.string().optional().nullable(),
  transferCounterpartyJarId: z.string().optional().nullable(),
  metadata: z.any().optional(),
});

// ---------- GET /api/jars/:jarId/transactions ----------
export const GET = withApi<{ params: JarParams }, NextRequest>(
  async (req, ctx) => {
    const { jarId } = await ctx.params;
    const userId = await requireUserId();
    await requireMember(jarId, userId);

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const q = ListQuery.parse(raw);

    const where: Prisma.TransactionWhereInput = { jarId };
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

    return rows;
  }
);

// ---------- POST /api/jars/:jarId/transactions ----------
export const POST = withApi<{ params: JarParams }, NextRequest>(
  async (req, ctx) => {
    const { jarId } = await ctx.params;
    const userId = await requireUserId();
    await requireMember(jarId, userId);

    const body = CreateBody.parse(await req.json());

    // business rules
    if (body.type === "TRANSFER") {
      if (body.categoryId)
        throw new HttpError(400, "Transfers cannot have categoryId.");
    } else {
      if (!body.categoryId)
        throw new HttpError(400, "categoryId is required for INCOME/EXPENSE.");

      const cat = await prisma.category.findFirst({
        where: { id: body.categoryId, jarId },
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
        jarId,
        createdBy: userId,
        type: body.type,
        amount: new Prisma.Decimal(body.amount),
        currency: body.currency, // simplified
        categoryId: body.categoryId ?? null,
        goalId: body.goalId ?? null,
        date: body.date,
        note: body.note ?? null,
        transferCounterpartyJarId: body.transferCounterpartyJarId ?? null,
        metadata: body.metadata, // simplified
      },
      include: { Category: true },
    });

    // withApi: 200 by default; if you prefer 201:
    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
);
