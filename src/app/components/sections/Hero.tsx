// src/components/sections/Hero.tsx
"use client";

import HoloOrb from "@/components/visual/HoloOrb";
import GradientButton from "@/components/ui/GradientButton";

export default function Hero() {
  return (
    <header className="grid gap-8 md:grid-cols-2 md:items-center">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl tracking-tight font-semibold">
          Research-grade Reflection
        </h1>
        <p className="text-slate-400">
          Precision metrics, private by design. Paste text and get values, themes, and stability—fast.
        </p>
        <div className="flex gap-3">
          <a href="#analyze"><GradientButton label="Start Analyzing" /></a>
        </div>
      </div>
      <HoloOrb />
    </header>
  );
}
