"use client";

import { useCallback, useState } from "react";

type AnalyzeOk =
  | {
      summary: string;
      values: unknown;
      emotions: unknown;
      themes: unknown;
      alignment: unknown;
    }
  | Record<string, unknown>;

type AnalyzeErr = { error: string; status: number; details?: unknown };

export function useAnalyze(initialText?: string) {
  const [data, setData] = useState<AnalyzeOk | null>(null);
  const [error, setError] = useState<AnalyzeErr | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (textArg?: string) => {
      const text = (textArg ?? initialText ?? "").toString();
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json as AnalyzeErr);
        } else {
          setData(json as AnalyzeOk);
        }
      } catch (e: unknown) {
        setError({
          error: "Network failure",
          status: 502,
          details: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setLoading(false);
      }
    },
    [initialText]
  );

  return { data, error, loading, run };
}
