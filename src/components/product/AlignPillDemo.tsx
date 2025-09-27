"use client";
import { useEffect, useState } from "react";

type Goal = { id:string; name:string; weight:number; lock?:boolean; deadline?:string; tags:string[] };
type Why = { name: string; value: number };

function errToString(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function AlignPillDemo() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sel, setSel] = useState("");
  const [score, setScore] = useState<number|null>(null);
  const [why, setWhy] = useState<Why[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("qeva_goals") || "[]") as Goal[];
      setGoals(saved.length ? saved : [{
        id:"g1", name:"Finish CA HW", weight:1, lock:true,
        deadline:"2025-09-30T23:59:00", tags:["rule 110","cellular automata"]
      }]);
    } catch {
      setGoals([{
        id:"g1", name:"Finish CA HW", weight:1, lock:true,
        deadline:"2025-09-30T23:59:00", tags:["rule 110","cellular automata"]
      }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("qeva_goals", JSON.stringify(goals));
  }, [goals]);

  async function safeJSON(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    try { return JSON.parse(text); } catch {
      return { error: "Bad JSON from server", raw: text.slice(0, 200) };
    }
  }

  async function onScore() {
    setLoading(true); setErr(""); setScore(null); setWhy([]);
    try {
      const host = typeof window !== "undefined" ? location.hostname : "localhost";
      const title = typeof document !== "undefined" ? document.title : "";
      const r = await fetch("/api/pill/score", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ snippet: sel, goals, host, title })
      });
      const data = await safeJSON(r) as { score?: number; why?: Why[]; error?: string };
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      if (typeof data.score !== "number") throw new Error("Missing score in response");
      setScore(data.score);
      setWhy(Array.isArray(data.why) ? data.why : []);
    } catch (e: unknown) {
      setErr(errToString(e));
    } finally {
      setLoading(false);
    }
  }

  async function onCompile(tpl:"slides"|"one_pager"|"flashcards") {
    setLoading(true); setErr("");
    try {
      const meta = {
        url: typeof window !== "undefined" ? location.href : "",
        title: typeof document !== "undefined" ? document.title : ""
      };
      const r = await fetch("/api/artifacts/compile", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ template: tpl, selection: sel, meta })
      });
      const data = await safeJSON(r) as { artifact?: { id?: string }, error?: string };
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      if (!data?.artifact?.id) throw new Error("Invalid artifact response");
      const blob = new Blob([JSON.stringify((data as any).artifact, null, 2)], { type:"application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(data as any).artifact.id}.json`;
      a.click();
    } catch (e: unknown) {
      setErr(errToString(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="text-sm mb-2">Paste a snippet → Score → Make Deliverable</div>
      <textarea value={sel} onChange={e=>setSel(e.target.value)} className="w-full h-40 rounded-xl bg-black/30 p-3" placeholder="Paste selection…"/>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={onScore} disabled={loading || !sel.trim()} className="px-4 py-2 rounded-xl bg-white/10">
          {loading? "Working…" : "Score"}
        </button>
        {score!=null && <span className="text-sm">Pill: <b>{score}</b>/100</span>}
        {!!why.length && <span className="text-xs text-slate-400">why: {why.map(w=>`${w.name}:${w.value.toFixed(2)}`).join(", ")}</span>}
      </div>
      <div className="mt-3 flex gap-3">
        <button onClick={()=>onCompile("slides")} disabled={loading || score==null} className="px-3 py-2 rounded-xl bg-white/10">Make Slides</button>
        <button onClick={()=>onCompile("one_pager")} disabled={loading || score==null} className="px-3 py-2 rounded-xl bg-white/10">One-pager</button>
        <button onClick={()=>onCompile("flashcards")} disabled={loading || score==null} className="px-3 py-2 rounded-xl bg-white/10">Flashcards</button>
      </div>
      {err && <div className="mt-3 text-xs text-red-400">Error: {err}</div>}
    </div>
  );
}
