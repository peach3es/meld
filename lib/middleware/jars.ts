"use server";

import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/withApi";
import { requireMember, requireUserId } from "@/lib/guards";

export type JarSummary = {
  id: string;
  name: string;
  currency: string;
};

export async function getJarSummary(jarId: string): Promise<JarSummary> {
  const userId = await requireUserId();
  await requireMember(jarId, userId);

  const jar = await prisma.jar.findUnique({
    where: { id: jarId },
    select: { id: true, name: true, currency: true },
  });

  if (!jar) {
    throw new HttpError(404, "Jar not found");
  }

  return jar;
}
