// src/components/ui/GradientButton.tsx
"use client";

type Props = React.ComponentProps<"button"> & { label: string; loading?: boolean };

export default function GradientButton({ label, loading, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="rounded-xl px-5 py-2.5 font-medium bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      {loading ? "Working…" : label}
    </button>
  );
}
