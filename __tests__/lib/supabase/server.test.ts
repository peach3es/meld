// tests/lib/supabase/supabase-server.test.ts
import { describe, it, expect, vi } from "vitest";

// --- Mock @supabase/ssr so we don't create a real client ---
vi.mock("@supabase/ssr", () => {
  return {
    createServerClient: vi.fn().mockImplementation((_url, _key, opts) => {
      // When auth.getUser() is called, touch the cookie adapter to prove it's wired.
      return {
        auth: {
          getUser: async () => {
            // Should be an array of { name, value }
            const all = opts.cookies.getAll?.() ?? [];
            // Optionally simulate a write to verify setAll is present
            opts.cookies.setAll?.([{ name: "sb-test", value: "ok" }]);
            // Return a simple, deterministic shape
            return {
              data: { user: null, cookieNames: all.map((c: any) => c.name) },
              error: null,
            };
          },
        },
      };
    }),
  };
});

// --- Mock next/headers cookies() (Next 15 is async) ---
vi.mock("next/headers", () => {
  // seed one auth cookie so getAll() returns something
  const bag = [{ name: "sb-auth", value: "abc" }] as Array<{
    name: string;
    value: string;
  }>;
  const writes: Array<{ name: string; value: string }> = [];

  return {
    cookies: async () => ({
      getAll: () => bag,
      // server.ts calls store.set({ name, value, ...options })
      set: ({ name, value }: { name: string; value: string }) => {
        writes.push({ name, value });
      },
    }),
  };
});

// If your tsconfig has "paths": { "@/*": ["./*"] }, this import works:
import { supabaseServer } from "@/lib/supabase/server";
// If not, use a relative import:  import { supabaseServer } from '../lib/supabase/server';
import { createServerClient } from "@supabase/ssr";

describe("supabaseServer helper", () => {
  it("creates a client and wires getAll/setAll cookie adapter", async () => {
    // ensure required env vars exist for the factory
    const OLD = process.env;
    process.env = {
      ...OLD,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    };

    const supabase = await supabaseServer();
    const res = await supabase.auth.getUser();

    // our mock returns names of cookies it saw via getAll()
    expect(res).toEqual({
      data: { user: null, cookieNames: ["sb-auth"] },
      error: null,
    });

    // ensure we passed a cookies adapter object to createServerClient
    const call = (createServerClient as unknown as { mock: any }).mock.calls[0];
    expect(call[2].cookies.getAll).toBeTypeOf("function");
    expect(call[2].cookies.setAll).toBeTypeOf("function");

    process.env = OLD;
  });
});
