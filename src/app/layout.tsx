import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import PlausibleTracker from "@/components/PlausibleTracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";

export const metadata: Metadata = {
  title: "Qeva",
  description: "Journal Reflection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      {plausibleDomain ? <Script defer data-domain={plausibleDomain} src={plausibleSrc} /> : null}
      <body className="min-h-dvh text-slate-100 antialiased">
        {/* subtle noise overlay */}
        <div aria-hidden className="pointer-events-none fixed inset-0 mix-blend-soft-light opacity-70" style={{ backgroundImage: "var(--noise)" }} />
        {children}
        {/* SPA pageview tracking */}
        <Suspense fallback={null}>
          <PlausibleTracker />
        </Suspense>
      </body>
    </html>
  );
}
