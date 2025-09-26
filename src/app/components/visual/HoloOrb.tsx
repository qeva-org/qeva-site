// src/components/visual/HoloOrb.tsx
"use client";

export default function HoloOrb() {
  return (
    <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-violet-600 to-cyan-400 opacity-70 blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
