type Props = { label: string; intensity: number; note: string };

export default function ColorFeedbackCard({ label, intensity, note }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4">
      <div className="text-sm text-slate-300"><b>{label}</b> · intensity {intensity}</div>
      <div className="mt-2 text-slate-400">{note}</div>
    </div>
  );
}
