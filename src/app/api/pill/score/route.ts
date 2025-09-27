// /api/pill/score
export async function POST(req: Request) {
  const { snippet, goals, host, title, now } = await req.json();
  const base = process.env.NEXT_PUBLIC_ENGINE_URL!;
  const r = await fetch(`${base}/v1/pill/score`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ snippet, goals, host, title, now })
  });
  const data = await r.json();
  return Response.json(data, { status: r.status });
}
