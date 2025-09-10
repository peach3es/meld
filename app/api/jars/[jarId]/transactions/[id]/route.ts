// app/api/jars/[jarId]/transactions/[id]/route.ts
import { withApi, forbidden, badRequest, HttpError } from "@/lib/withApi";
import { prisma } from "@/lib/prisma";
import { requireUserId, assertChildOwnership } from "@/lib/guards";
import { Prisma } from "@prisma/client";
import type {Transaction,Prisma as PrismaTypes } from "@prisma/client";

type Ctx = { params: Promise<{ jarId: string; id: string }> };

/** Ensures the txn exists, user is a member, and the txn belongs to the jar in the URL. */
async function authorize(jarId: string, txId: string, userId: string) {
  const childJarId = await assertChildOwnership("transaction", txId, userId);
  if (childJarId !== jarId) forbidden("Forbidden (cross-jar)");
}

export const GET = withApi<Ctx>(async (_req, { params }) => {
  const { jarId, id } = await params;
  const userId = await requireUserId();
  await authorize(jarId, id, userId);

  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) throw new HttpError(404, "Not found");
  return tx;
});

/** Updatable fields for Transaction, per your schema. */
type TxPatch = {
  // Decimal(12,2) → accept number or string
  amount?: number | string;

  note?: string | null;
  categoryId?: string | null;
  goalId?: string | null;

  // DateTime
  date?: string; // ISO-8601

  // enum TransactionType
  type?: Transaction["type"];

  // transfer-only helper
  transferCounterpartyJarId?: string | null;

  // JSON metadata
  metadata?: Prisma.InputJsonValue | null;
};

// narrow “unknown” to JSON-safe
function isJsonValue(v: unknown): v is Prisma.InputJsonValue {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(v)) return v.every(isJsonValue);
  if (t === "object") {
    for (const [val] of Object.entries(v as Record<string, unknown>)) {
      if (!isJsonValue(val)) return false;
    }
    return true;
  }
  return false; // functions, undefined, symbols, bigint
}

/** Whitelist + runtime checks */
function pickPatch(input: unknown): TxPatch {
  if (!input || typeof input !== "object") return {};
  const i = input as Record<string, unknown>;
  const out: TxPatch = {};

  if (typeof i.amount === "number" || typeof i.amount === "string")
    out.amount = i.amount as number | string;

  if (typeof i.note === "string" || i.note === null)
    out.note = (i.note ?? null) as string | null;

  if (typeof i.categoryId === "string" || i.categoryId === null)
    out.categoryId = (i.categoryId as string) ?? null;

  if (typeof i.goalId === "string" || i.goalId === null)
    out.goalId = (i.goalId as string) ?? null;

  if (typeof i.date === "string") out.date = i.date;

  if (i.type === "INCOME" || i.type === "EXPENSE")
    out.type = i.type as Transaction["type"];

  if (
    typeof i.transferCounterpartyJarId === "string" ||
    i.transferCounterpartyJarId === null
  ) {
    out.transferCounterpartyJarId =
      (i.transferCounterpartyJarId as string) ?? null;
  }

  if (i.metadata === null || isJsonValue(i.metadata)) out.metadata = i.metadata as Prisma.InputJsonValue | null;

  return out;
}

/** Map TxPatch → Prisma.TransactionUpdateInput (no broad casts) */
function toPrismaUpdate(p: TxPatch): PrismaTypes.TransactionUpdateInput {
  const data: PrismaTypes.TransactionUpdateInput = {};

  // amount: Decimal(12,2)
  if (p.amount !== undefined) {
    // accept number or string
    data.amount = new Prisma.Decimal(p.amount as string | number);
  }

  if (p.note !== undefined) data.note = p.note;

  if (p.date) data.date = new Date(p.date);

  if (p.type !== undefined) data.type = p.type;

  // metadata: nullable JSON
  if (p.metadata !== undefined) {
    // p.metadata === null  -> SQL NULL
    // p.metadata === Prisma.JsonNull -> JSON null (if you ever want to set that)
    data.metadata = p.metadata === null ? Prisma.DbNull : p.metadata;
  }

  if (p.categoryId !== undefined) {
    data.Category = p.categoryId
      ? { connect: { id: p.categoryId } }
      : { disconnect: true };
  }

  if (p.goalId !== undefined) {
    data.Goal = p.goalId
      ? { connect: { id: p.goalId } }
      : { disconnect: true };
  }

  if (p.transferCounterpartyJarId !== undefined) {
    data.CounterpartyJar = p.transferCounterpartyJarId
      ? { connect: { id: p.transferCounterpartyJarId } }
      : { disconnect: true };
  }

  return data;
}


export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const { jarId, id } = await params;
  const userId = await requireUserId();
  await authorize(jarId, id, userId);

  const patch = pickPatch(await req.json().catch(() => ({})));
  if (Object.keys(patch).length === 0) badRequest("No updatable fields");

  // (Optional) If you enforce category type matching, add a check here:
  // if (patch.categoryId && patch.type) { ... }

  const updated = await prisma.transaction.update({
    where: { id },
    data: toPrismaUpdate(patch),
  });
  return updated;
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  const { jarId, id } = await params;
  const userId = await requireUserId();
  await authorize(jarId, id, userId);

  await prisma.transaction.delete({ where: { id } });
  // withApi: returning void → 204
});
