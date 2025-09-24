import dynamic from "next/dynamic";
import AnalyzerForm from "@/components/product/AnalyzerForm";
import GradientButton from "@/components/ui/GradientButton";

const HoloOrb = dynamic(() => import("@/components/visual/HoloOrb"), { ssr: false });

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      {/* L0: hero */}
      <header className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <h1 className="font-[var(--font-grotesk)] text-4xl md:text-5xl tracking-tight">
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

      {/* L1: product surface */}
      <section className="mt-12">
        <AnalyzerForm />
      </section>
    </main>
  );
}
