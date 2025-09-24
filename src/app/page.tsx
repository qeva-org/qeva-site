"use client";

import { useState } from "react";

type AnalyzeResp = {
  reflection: any;
  metrics: Record<string, number>;
  color: { color: string; intensity: number; note: string };
};

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AnalyzeResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as AnalyzeResp;
      setRes(data);
    } catch (e: any) {
      setErr(e.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh p-6 md:p-10 bg-slate-950 text-slate-100">

      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">Qeva — Journal Reflection</h1>
          <p className="text-slate-400">Seamless UI on Vercel. Python compute on Render.</p>
        </header>

        <section className="space-y-2">
          <textarea
            className="w-full h-40 rounded-md bg-slate-900 border border-slate-800 p-3 outline-none"
            placeholder="Paste your journal entry…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={submit}
            disabled={loading || !text.trim()}
            className="px-4 py-2 rounded-md bg-indigo-600 disabled:opacity-60"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </section>

        {err && <div className="text-red-400">Error: {err}</div>}

        {res && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 p-4 bg-slate-900">
              <h2 className="text-lg font-medium mb-2">Color</h2>
              <div className="text-sm">
                <div><b>Label:</b> {res.color.color}</div>
                <div><b>Intensity:</b> {res.color.intensity}</div>
                <div className="mt-2 text-slate-300">{res.color.note}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 p-4 bg-slate-900">
              <h2 className="text-lg font-medium mb-2">Metrics</h2>
              <ul className="text-sm grid grid-cols-2 gap-2">
                {Object.entries(res.metrics).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-mono">{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 p-4 bg-slate-900 md:col-span-2">
              <h2 className="text-lg font-medium mb-2">Reflection</h2>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(res.reflection, null, 2)}
              </pre>
            </div>

          </section>
        )}
      </div>
    </main>
  );
}
