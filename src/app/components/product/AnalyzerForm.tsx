"use client";

import { useState } from "react";
import GradientButton from "@/components/ui/GradientButton";
import GlassPanel from "@/components/ui/GlassPanel";
import MetricsGrid from "@/components/product/MetricsGrid";
import ColorFeedbackCard from "@/components/product/ColorFeedbackCard";

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
      <GlassPanel title="Analyze">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your journal entry…"
          className="h-40 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 outline-none placeholder:text-slate-500"
        />
        <div className="mt-3 flex gap-3">
          <GradientButton onClick={submit} label="Analyze" loading={loading} />
          {err && <span className="text-red-400 text-sm">Error: {err}</span>}
        </div>
      </GlassPanel>

      {res && (
        <div className="grid gap-5 md:grid-cols-2">
          <GlassPanel title="Color Feedback"><ColorFeedbackCard label={res.color.color} intensity={res.color.intensity} note={res.color.note} /></GlassPanel>
          <GlassPanel title="Metrics"><MetricsGrid metrics={res.metrics} /></GlassPanel>
          <GlassPanel title="Reflection" className="md:col-span-2">
            <pre className="whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(res.reflection, null, 2)}</pre>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
