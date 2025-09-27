export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errToString(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function POST(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_ENGINE_URL;
    if (!base) {
      return new Response(
        JSON.stringify({ error: "Missing NEXT_PUBLIC_ENGINE_URL" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const payload = await req.json();

    const upstream = await fetch(`${base}/v1/events/append`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    const isJSON =
      (upstream.headers.get("content-type") || "").includes("application/json") &&
      text.trim().length > 0;

    const body = isJSON ? JSON.parse(text) : (text ? { raw: text } : {});
    return new Response(JSON.stringify(body), {
      status: upstream.ok ? 200 : upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: errToString(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
