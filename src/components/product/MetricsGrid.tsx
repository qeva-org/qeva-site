type Props = { metrics: Record<string, number> };

export default function MetricsGrid({ metrics }: Props) {
  const entries = Object.entries(metrics ?? {});
  return (
    <div className="grid grid-cols-2 gap-3">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-xs text-slate-400">{k}</div>
          <div className="font-mono text-lg">{Number.isFinite(v) ? v : "-"}</div>
        </div>
      ))}
    </div>
  );
}
