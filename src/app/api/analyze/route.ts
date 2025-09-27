import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyzeBody = { text?: string };

type DemoPayload = {
  summary: string;
  values: Array<{ name: string; score: number }>;
  emotions: Array<{ name: string; score: number }>;
  themes: string[];
  alignment: { score: number; rationale: string[] };
};

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function demoPayload(): DemoPayload {
  return {
    summary:
      "Demo analysis: set VALUES_ENGINE_URL to enable the upstream engine. This static payload ensures preview builds function without envs.",
    values: [
      { name: "Curiosity", score: 0.82 },
      { name: "Discipline", score: 0.61 },
      { name: "Growth", score: 0.57 },
    ],
    emotions: [
      { name: "Focused", score: 0.74 },
      { name: "Calm", score: 0.41 },
      { name: "Anxious", score: 0.22 },
    ],
    themes: ["productivity", "research", "alignment"],
    alignment: {
      score: 0.68,
      rationale: ["Goal/keyword overlap detected", "Neutral–positive tone"],
    },
  };
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody = {};
  try {
    body = await req.json();
  } catch {
    // Continue with empty body; upstream may handle empty text, and demo still works.
  }

  const text = typeof body?.text === "string" ? body.text : "";

  const base = process.env.VALUES_ENGINE_URL;
  const path = process.env.VALUES_ENGINE_PATH || "/analyze";
  const key = process.env.VALUES_ENGINE_KEY;

  // Fallback demo when no upstream is configured.
  if (!base) {
    return NextResponse.json(demoPayload(), { status: 200 });
  }

  const target = joinUrl(base, path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}`, "x-api-key": key } : {}),
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (res.ok) {
      // Return upstream JSON verbatim; if not JSON, try text.
      try {
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
      } catch {
        const txt = await res.text();
        return NextResponse.json(txt, { status: 200 });
      }
    }

    // Non-200 → surface as 502 with structured error.
    let details: unknown = null;
    try {
      details =
        res.headers.get("content-type")?.includes("application/json")
          ? await res.json()
          : await res.text();
    } catch {
      // keep details as null
    }

    return NextResponse.json(
      {
        error: "Upstream error",
        status: 502,
        details: { upstreamStatus: res.status, body: details },
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    clearTimeout(timeout);
    return NextResponse.json(
      {
        error: "Network failure",
        status: 502,
        details:
          err instanceof Error ? err.message : typeof err === "string" ? err : null,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed", status: 405, details: "Use POST /api/analyze with {text}" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
