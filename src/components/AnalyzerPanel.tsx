'use client';

import { useRef, useState, KeyboardEvent, FormEvent } from 'react';
import { track } from '@/lib/telemetry';
import ResultCard from './ResultCard';

export default function AnalyzerPanel() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<unknown | null>(null);

  const alertRef = useRef<HTMLDivElement>(null);

  async function submit() {
    if (!text.trim()) {
      setResult(null);
      setErrorMsg('Please enter text to analyze.');
      setTimeout(() => alertRef.current?.focus(), 0);
      return;
    }

    const started = Date.now();
    track('analyze_submitted', { text_len: text.length });

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        let message = `Upstream error (status ${res.status})`;
        try {
          const payload = await res.json();
          if (payload?.error) message = String(payload.error);
        } catch {
          /* ignore JSON parse error */
        }
        setErrorMsg(message);
        track('analyze_error', { status: res.status });
        setTimeout(() => alertRef.current?.focus(), 0);
        return;
      }

      const data = (await res.json()) as unknown;
      setResult(data);
      track('analyze_success', { dur_ms: Date.now() - started });
    } catch {
      setErrorMsg('Network error: unable to reach /api/analyze.');
      track('analyze_error', { network: true });
      setTimeout(() => alertRef.current?.focus(), 0);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={onSubmit} aria-busy={loading} className="space-y-4">
      <div>
        <label htmlFor="analyze-text" className="block text-sm font-medium mb-1">
          Text to analyze
        </label>
        <textarea
          id="analyze-text"
          name="text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          required
          aria-describedby="analyze-help"
          className="w-full rounded-md border p-3 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-600
                     focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        />
        <p id="analyze-help" className="mt-1 text-xs text-gray-500">
          Press Ctrl+Enter (Cmd+Enter on Mac) to submit.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium
                     hover:bg-blue-700 disabled:opacity-60
                     focus:outline-none focus:ring-2 focus:ring-blue-600
                     focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-gray-500">
          {loading ? 'Analyzing...' : null}
        </span>
      </div>

      {errorMsg && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800
                     focus:outline-none focus:ring-2 focus:ring-red-600
                     focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {errorMsg}
        </div>
      )}

      <ResultCard data={result} />
    </form>
  );
}

