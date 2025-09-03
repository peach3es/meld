// lib/guards.ts
import "server-only";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/withApi";


/** Returns the current Supabase user id (server-side), or null. */
export async function getUserId(): Promise<string | null> {
  let jwt: string | undefined;

  try {
    const h = await headers();
    const auth = h.get("authorization") ?? null;
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      jwt = auth.slice(7).trim();
    }
  } catch {
    // No request scope in unit tests -> ignore and continue.
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error) return null;
  return data.user?.id ?? null;
}/** Requires a logged-in user; throws 401 if unauthenticated. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new HttpError(401, "Unauthorized");
  return id;
}

/** Throws 403 if the user is NOT a member of the given jar. */
export async function requireMember(jarId: string, userId: string) {
  const member = await prisma.jarMember.findUnique({
    where: { jarId_userId: { jarId, userId } },
    select: { userId: true },
  });
  // Match your tests' expectation:
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

type JarIdRow = { jarId: string };
type FindUniqueJarId = (args: {
  where: { id: string };
  select: { jarId: true };
}) => Promise<JarIdRow | null>;

type PrismaModelWithJarId = { findUnique: FindUniqueJarId };

const jarById =
  <M extends PrismaModelWithJarId>(model: M) =>
  (id: string) =>
    model.findUnique({ where: { id }, select: { jarId: true } });

const CHILD_SELECTORS = {
  transaction: jarById(prisma.transaction),
  category: jarById(prisma.category),
  budget: jarById(prisma.budget),
  goal: jarById(prisma.goal),
  invite: jarById(prisma.invite),
  recurringTransaction: jarById(prisma.recurringTransaction),
} satisfies Record<
  ChildKind,
  (id: string) => Promise<{ jarId: string } | null>
>;

export async function assertChildOwnership(
  kind: ChildKind,
  id: string,
  userId: string
): Promise<string> {
  const fetch = CHILD_SELECTORS[kind]; // compile-time exhaustiveness via `satisfies`
  const child = await fetch(id); // { jarId } | null
  if (!child) throw new HttpError(404, "Not found");
  await requireMember(child.jarId, userId);
  return child.jarId;
}
