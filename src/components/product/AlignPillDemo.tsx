"use client";
import { useEffect, useState } from "react";

type Goal = { id:string; name:string; weight:number; lock?:boolean; deadline?:string; tags:string[] };
const defaultGoals: Goal[] = [{ id:"g1", name:"Finish CA HW", weight:1, lock:true, deadline:"2025-09-30T23:59:00", tags:["rule 110","cellular automata"] }];

export default function AlignPillDemo() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem("qeva_goals") || "[]"); } catch { return []; }
  });
  const [sel, setSel] = useState(""); const [score, setScore] = useState<number|null>(null);
  const [why, setWhy] = useState<{name:string; value:number}[]>([]); const [loading, setLoading] = useState(false);

  useEffect(() => { if (!goals.length) setGoals(defaultGoals); }, []);
  useEffect(() => { localStorage.setItem("qeva_goals", JSON.stringify(goals)); }, [goals]);

  async function onScore() {
    setLoading(true); setScore(null);
    const host = typeof window !== "undefined" ? location.hostname : "localhost";
    const title = typeof document !== "undefined" ? document.title : "";
    const r = await fetch("/api/pill/score", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ snippet: sel, goals, host, title }) });
    const data = await r.json(); setScore(data.score); setWhy(data.why || []); setLoading(false);
  }

  async function onCompile(tpl:"slides"|"one_pager"|"flashcards") {
    const meta = { url: typeof window!=="undefined" ? location.href : "", title: typeof document!=="undefined" ? document.title : "" };
    const r = await fetch("/api/artifacts/compile", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ template: tpl, selection: sel, meta }) });
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data.artifact,null,2)], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${data.artifact.id}.json`; a.click();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="text-sm mb-2">Paste a snippet → Score → Make Deliverable</div>
      <textarea value={sel} onChange={e=>setSel(e.target.value)} className="w-full h-40 rounded-xl bg-black/30 p-3" placeholder="Paste selection…"/>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={onScore} disabled={loading || !sel} className="px-4 py-2 rounded-xl bg-white/10">{loading? "Scoring…" : "Score"}</button>
        {score!=null && <span className="text-sm">Pill: <b>{score}</b>/100</span>}
        {!!why.length && <span className="text-xs text-slate-400">why: {why.map(w=>`${w.name}:${w.value.toFixed(2)}`).join(", ")}</span>}
      </div>
      <div className="mt-3 flex gap-3">
        <button onClick={()=>onCompile("slides")} disabled={score==null} className="px-3 py-2 rounded-xl bg-white/10">Make Slides</button>
        <button onClick={()=>onCompile("one_pager")} disabled={score==null} className="px-3 py-2 rounded-xl bg-white/10">One-pager</button>
        <button onClick={()=>onCompile("flashcards")} disabled={score==null} className="px-3 py-2 rounded-xl bg-white/10">Flashcards</button>
      </div>
      <div className="mt-4 text-xs text-slate-400">Park/Later: for now, save your snippet to bookmarks; next iteration will call /v1/events/append.</div>
    </div>
  );
}
