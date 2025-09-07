// app/api/keepalive/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url       = process.env.SUPABASE_URL;                // https://<project_ref>.supabase.co
  const srk       = process.env.SUPABASE_SERVICE_ROLE_KEY;   // server-only, never expose client-side
  const resource  = process.env.KEEPALIVE_TABLE;          // e.g., "transactions" or a tiny view like "heartbeat"
  const select    = process.env.KEEPALIVE_COLUMN || "id";    // a light column; "*" if unsure
  const at        = new Date().toISOString();

  if (!url || !srk || !resource) {
    console.warn("KEEPALIVE: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/KEEPALIVE_TABLE");
    return Response.json({ ok: false, message: "keepalive skipped (missing env)", at }, { status: 200 });
  }

  const qs = new URLSearchParams({ select, limit: "1" });

  try {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(resource)}?${qs}`, {
      method: "GET",
      headers: {
        apikey: srk,
        authorization: `Bearer ${srk}`,
        Prefer: "count=none",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!r.ok) {
      console.warn("KEEPALIVE: REST select failed", r.status);
    }

    return Response.json(
      {
        ok: r.ok,
        message: r.ok ? "keepalive OK (DB touched via REST)" : `keepalive REST error (status ${r.status})`,
        at,
        resource,
        select,
        status: r.status,
      },
      { status: 200 } // always 200 so your cron doesn't fail noisily
    );
  } catch (e) {
    console.warn("KEEPALIVE: REST error", e);
    return Response.json({ ok: false, message: "keepalive exception (see logs)", at }, { status: 200 });
  }
}
