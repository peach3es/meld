// __tests__/lib/guards.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoisted mock fns so the prisma factory can use them ---
const prismaFns = vi.hoisted(() => {
  return {
    jarMemberFindUnique: vi.fn(),
    transactionFindUnique: vi.fn(),
    categoryFindUnique: vi.fn(),
    budgetFindUnique: vi.fn(),
    goalFindUnique: vi.fn(),
    inviteFindUnique: vi.fn(),
    recurringTransactionFindUnique: vi.fn(),
  };
});

// --- Mocks ---
vi.mock("@/lib/supabase/server", () => {
  return {
    supabaseServer: vi.fn().mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    }),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jarMember: { findUnique: prismaFns.jarMemberFindUnique },
    transaction: { findUnique: prismaFns.transactionFindUnique },
    category: { findUnique: prismaFns.categoryFindUnique },
    budget: { findUnique: prismaFns.budgetFindUnique },
    goal: { findUnique: prismaFns.goalFindUnique },
    invite: { findUnique: prismaFns.inviteFindUnique },
    recurringTransaction: {
      findUnique: prismaFns.recurringTransactionFindUnique,
    },
  },
}));

import {
  getUserId,
  requireUserId,
  requireMember,
  assertChildOwnership,
  HttpError,
} from "@/lib/guards";
import { supabaseServer } from "@/lib/supabase/server";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabaseServer).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
  } as any);
});

describe("guards", () => {
  it("getUserId returns the current user id when authenticated", async () => {
    const id = await getUserId();
    expect(id).toBe("u1");
    expect(supabaseServer).toHaveBeenCalled();
  });

  it("requireUserId returns id when logged in", async () => {
    await expect(requireUserId()).resolves.toBe("u1");
  });

  it("requireUserId throws 401 when unauthenticated", async () => {
    vi.mocked(supabaseServer).mockResolvedValueOnce({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    await expect(requireUserId()).rejects.toMatchObject({
      status: 401,
      message: "Unauthorized",
    });
  });

  it("requireMember resolves when JarMember exists (composite unique)", async () => {
    prismaFns.jarMemberFindUnique.mockResolvedValueOnce({ userId: "u1" });

    await expect(requireMember("jar1", "u1")).resolves.toBeUndefined();
    expect(prismaFns.jarMemberFindUnique).toHaveBeenCalledWith({
      where: { jarId_userId: { jarId: "jar1", userId: "u1" } },
      select: { userId: true },
    });
  });

  it("requireMember throws 403 when user is not a member", async () => {
    prismaFns.jarMemberFindUnique.mockResolvedValueOnce(null);

    await expect(requireMember("jarX", "u1")).rejects.toMatchObject({
      status: 403,
      message: "Forbidden",
    });
  });

  it("assertChildOwnership(transaction) returns jarId when user belongs to the jar", async () => {
    prismaFns.transactionFindUnique.mockResolvedValueOnce({ jarId: "jar1" });
    prismaFns.jarMemberFindUnique.mockResolvedValueOnce({ userId: "u1" });

    await expect(
      assertChildOwnership("transaction", "tx1", "u1")
    ).resolves.toBe("jar1");

    expect(prismaFns.transactionFindUnique).toHaveBeenCalledWith({
      where: { id: "tx1" },
      select: { jarId: true },
    });
    expect(prismaFns.jarMemberFindUnique).toHaveBeenCalledWith({
      where: { jarId_userId: { jarId: "jar1", userId: "u1" } },
      select: { userId: true },
    });
  });

  it("assertChildOwnership(transaction) throws 404 when the child does not exist", async () => {
    prismaFns.transactionFindUnique.mockResolvedValueOnce(null);

    await expect(
      assertChildOwnership("transaction", "missing", "u1")
    ).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
  });

  it("assertChildOwnership(transaction) throws 403 when user not a member of the child jar", async () => {
    prismaFns.transactionFindUnique.mockResolvedValueOnce({ jarId: "jar2" });
    prismaFns.jarMemberFindUnique.mockResolvedValueOnce(null);

    await expect(
      assertChildOwnership("transaction", "tx2", "u1")
    ).rejects.toMatchObject({
      status: 403,
      message: "Forbidden",
    });
  });

  it("assertChildOwnership(category) behaves the same (happy path)", async () => {
    prismaFns.categoryFindUnique.mockResolvedValueOnce({ jarId: "jar9" });
    prismaFns.jarMemberFindUnique.mockResolvedValueOnce({ userId: "u1" });

    await expect(assertChildOwnership("category", "cat1", "u1")).resolves.toBe(
      "jar9"
    );

    expect(prismaFns.categoryFindUnique).toHaveBeenCalledWith({
      where: { id: "cat1" },
      select: { jarId: true },
    });
  });
});
