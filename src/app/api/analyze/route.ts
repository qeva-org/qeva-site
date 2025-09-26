// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
const API_BASE = process.env.BACKEND_BASE!;

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const r = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    keepalive: true
  });
  if (!r.ok) return NextResponse.json({ error: "backend_error" }, { status: 502 });
  return NextResponse.json(await r.json());
}
