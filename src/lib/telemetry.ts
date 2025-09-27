export type TelemetryEvent =
  | 'analyze_submitted'
  | 'analyze_success'
  | 'analyze_error'

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void
  }
}

function sanitize(props?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!props) return out
  for (const [k, v] of Object.entries(props)) {
    if (/email|e-mail|phone|tel|name|user|password|token|auth/i.test(k)) continue
    if (typeof v === 'string') out[k] = v.length > 256 ? v.slice(0, 256) : v
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return out
}

export function track(name: TelemetryEvent, props?: Record<string, unknown>) {
  const safe = sanitize(props)

  // Fire-and-forget to backend
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, props: safe }),
      keepalive: true,
    }).catch(() => {})
  } catch {}

  // Also forward to Plausible if available (custom events)
  try {
    if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
      window.plausible(name, { props: safe })
    }
  } catch {}
}
