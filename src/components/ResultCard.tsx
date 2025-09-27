'use client';

import { memo } from 'react';

type ResultCardProps = {
  data: unknown | null;
};

function ResultCard({ data }: ResultCardProps) {
  if (data == null) return null;

  return (
    <section aria-live="polite" aria-atomic="true" className="mt-4">
      <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/40 p-4">
        <h3 className="text-sm font-medium mb-2">Result</h3>
        <pre className="whitespace-pre-wrap break-words text-sm overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </section>
  );
}

export default memo(ResultCard);
