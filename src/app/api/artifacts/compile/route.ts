export async function POST(req: Request) {
  const { template, selection, meta } = await req.json();
  const base = process.env.NEXT_PUBLIC_ENGINE_URL!;
  const r = await fetch(`${base}/v1/artifacts/compile`, {
    method: "POST", headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ template, selection, meta })
  });
  const data = await r.json();
  return Response.json(data, { status: r.status });
}
