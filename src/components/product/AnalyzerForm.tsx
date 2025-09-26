"use client";

import { useState } from "react";

type AnalyzeResp = {
  reflection: any;
  metrics: Record<string, number>;
  color: { color: string; intensity: number; note: string };
};

export default function AnalyzerForm() {
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
        cache: "no-store",
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
    <div id="analyze" className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="text-sm/5 text-slate-300 mb-2">Analyze</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your journal entry…"
          className="h-40 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 outline-none placeholder:text-slate-500"
        />
        <div className="mt-3 flex gap-3">
          <button onClick={submit} disabled={loading || !text.trim()} className="rounded-xl px-5 py-2.5 font-medium bg-white/10 hover:bg-white/15 disabled:opacity-60">
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          {err && <span className="text-red-400 text-sm">Error: {err}</span>}
        </div>
      </div>

      {res && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="text-sm/5 text-slate-300 mb-2">Result</div>
          <pre className="whitespace-pre-wrap text-xs text-slate-300">
            {JSON.stringify(res, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
