import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: "Qeva",
  description: "Journal Reflection, research-grade.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-dvh text-slate-100 antialiased">
        {/* subtle noise overlay */}
        <div aria-hidden className="pointer-events-none fixed inset-0 mix-blend-soft-light opacity-70" style={{ backgroundImage: "var(--noise)" }} />
        {children}
      </body>
    </html>
  );
}
