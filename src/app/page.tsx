// src/app/page.tsx  (SERVER COMPONENT)
import Hero from "@/components/sections/Hero";
import AnalyzerForm from "@/components/product/AnalyzerForm";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <Hero />
      <section className="mt-12">
        <AnalyzerForm />
      </section>
    </main>
  );
}
