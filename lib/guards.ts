// lib/guards.ts
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// tiny HTTP-style error for route handlers / server actions
export class HttpError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Returns the current Supabase user id (server-side), or null. */
export async function getUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

/** Requires a logged-in user; throws 401 if unauthenticated. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new HttpError(401, "Unauthorized");
  return id;
}

/** Throws 403 if the user is NOT a member of the given jar. */
export async function requireMember(
  jarId: string,
  userId: string
): Promise<void> {
  const member = await prisma.jarMember.findUnique({
    where: { jarId_userId: { jarId, userId } }, // uses your composite unique
    select: { userId: true },
  });
  if (!member) throw new HttpError(403, "Forbidden");
}

/**
 * Ensures the child record belongs to a jar the user is a member of.
 * Kinds map directly to your Prisma client keys.
 */
export type ChildKind =
  | "transaction"
  | "category"
  | "budget"
  | "goal"
  | "invite"
  | "recurringTransaction";

const CHILD_SELECTORS = {
  transaction: (id: string) =>
    prisma.transaction.findUnique({ where: { id }, select: { jarId: true } }),
  category: (id: string) =>
    prisma.category.findUnique({ where: { id }, select: { jarId: true } }),
  budget: (id: string) =>
    prisma.budget.findUnique({ where: { id }, select: { jarId: true } }),
  goal: (id: string) =>
    prisma.goal.findUnique({ where: { id }, select: { jarId: true } }),
  invite: (id: string) =>
    prisma.invite.findUnique({ where: { id }, select: { jarId: true } }),
  recurringTransaction: (id: string) =>
    prisma.recurringTransaction.findUnique({
      where: { id },
      select: { jarId: true },
    }),
} satisfies Record<
  ChildKind,
  (id: string) => Promise<{ jarId: string } | null>
>;

export async function assertChildOwnership(
  kind: ChildKind,
  id: string,
  userId: string
): Promise<string> {
  const fetch = CHILD_SELECTORS[kind];
  const child = await fetch(id);
  if (!child) throw new HttpError(404, "Not found");
  await requireMember(child.jarId, userId);
  return child.jarId;
}
