// app/api/jars/[jarId]/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireMember, requireUserId } from "@/lib/guards";
import { badRequest, withApi } from "@/lib/withApi";

export const runtime = "nodejs";

type JarParams = Promise<{ jarId: string }>;

const EntryType = z.enum(["INCOME", "EXPENSE", "SAVINGS"]);

const ListQuery = z.object({
  entryType: EntryType.optional(),
  includeArchived: z
    .union([z.literal("true"), z.literal("false")])
    .default("false"),
});

export const GET = withApi<{ params: JarParams }, NextRequest>(
  async (req, ctx) => {
    const { jarId } = await ctx.params;
    const userId = await requireUserId();
    await requireMember(jarId, userId);

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = ListQuery.safeParse(raw);

    if (!parsed.success) {
      const errTree = z.treeifyError(parsed.error);
      return badRequest("Invalid query parameters", "ZOD_VALIDATION", errTree);
    }

    const { entryType, includeArchived } = parsed.data;

    const categories = await prisma.category.findMany({
      where: {
        jarId,
        ...(entryType ? { entryType } : {}),
        ...(includeArchived === "true" ? {} : { isArchived: false }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, entryType: true },
    });

    return NextResponse.json(categories);
  }
);
