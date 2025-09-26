// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
const API_BASE = process.env.BACKEND_BASE!;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return Response.json({ error: "Missing `text`" }, { status: 400 });
    }

    const base = process.env.VALUES_ENGINE_URL; // e.g., https://qeva-values-engine.onrender.com
    const path = process.env.VALUES_ENGINE_PATH || "/analyze";
    const key  = process.env.VALUES_ENGINE_KEY; // optional

    if (!base) {
      // Safe fallback so preview builds still work
      return Response.json(
        {
          summary: "Preview mode (no upstream configured).",
          values: ["example"],
          emotions: ["calm"],
          themes: ["demo"],
          alignment: { self_consistency_0_1: 0.42, value_tension_notes: "preview" }
        },
        { status: 200 }
      );
    }

    const upstream = new URL(path, base).toString();
    const res = await fetch(upstream, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {})
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: "Upstream error", status: res.status, details: data },
        { status: 502 }
      );
    }
    return Response.json(data, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
