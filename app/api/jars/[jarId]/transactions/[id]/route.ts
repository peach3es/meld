import { withApi, forbidden, badRequest, HttpError } from "@/lib/withApi";
import { prisma } from "@/lib/prisma";
import { requireUserId, assertChildOwnership } from "@/lib/guards";

type Ctx = { params: Promise<{ jarId: string; id: string }> };

/** Ensures the txn exists, user is a member, and the txn belongs to the jar in the URL. */
async function authorize(jarId: string, txId: string, userId: string) {
  // Your helper both checks membership and returns the child's jarId.
  const childJarId = await assertChildOwnership("transaction", txId, userId);
  if (childJarId !== jarId) forbidden("Forbidden (cross-jar)");
}

export const GET = withApi<Ctx>(async (_req, { params }) => {
  const { jarId, id } = await params;
  const userId = await requireUserId();
  await authorize(jarId, id, userId);

  const tx = await prisma.transaction.findUnique({ where: { id: id } });
  if (!tx) throw new HttpError(404, "Not found");
  return tx;
});

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const { jarId, id } = await params;
  const userId = await requireUserId();
  await authorize(jarId, id, userId);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // TODO: tighten this to your exact schema fields.
  // Keep a conservative whitelist so jarId/ids cannot be changed.
  const allowed = [
    "amount", "memo", "note", "categoryId", "date", "occurredAt", "isPending", "payee", "type",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  if (Object.keys(data).length === 0) badRequest("No updatable fields");

  const updated = await prisma.transaction.update({
    where: { id: id },
    data: data as Record<string, unknown>,
  });
  return updated;
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  const { jarId, id } = await params;
  const userId = await requireUserId();
  await authorize(jarId, id, userId);

  await prisma.transaction.delete({ where: { id: id } });
  // withApi: returning void yields 204 No Content
});
