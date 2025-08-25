// lib/supabase/server.ts
import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-only Supabase client for API routes & server actions.
 * Uses the modern getAll/setAll cookie adapter (no deprecated methods).
 */
export async function supabaseServer() {
  const store = await cookies(); // Next.js 15: cookies() is async

  return createServerClient(
    process.env.SUPABASE_URL!, // ensure these are set
    process.env.SUPABASE_ANON_KEY!, // in .env.local
    {
      cookies: {
        getAll() {
          // Adapt Next's cookie store to the shape SSR expects
          return store.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            // Next allows setting via an object with { name, value, ...options }
            store.set({ name, value, ...options });
          }
        },
      },
    }
  );
}
