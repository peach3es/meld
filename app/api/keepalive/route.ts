// app/api/keepalive/route.ts
export const dynamic = "force-dynamic"; // don’t cache
export const revalidate = 0;

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Don’t throw; we still return 204 to avoid failing cron runs,
    // but log a warning to help debugging in Vercel logs.
    console.warn("KEEPALIVE: missing SUPABASE_URL or ANON_KEY");
    return new Response(null, { status: 204 });
  }

  try {
    // A safe, lightweight GET that requires only the anon key.
    // This hits Supabase Auth and should count as activity.
    const res = await fetch(`${url}/auth/v1/settings`, {
      method: "GET",
      headers: { apikey: anon },
      // avoid caching at the proxy/CDN
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn("KEEPALIVE: non-OK response", res.status);
    }
  } catch (e) {
    // Swallow errors so the route is always 204, but log for visibility.
    console.warn("KEEPALIVE: fetch error", e);
  }

  return new Response(null, { status: 204 });
}
