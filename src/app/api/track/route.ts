import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EventRecord = {
  ts: number
  name: string
  props: Record<string, unknown>
}

const BUFFER_SIZE = Number(process.env.TELEMETRY_BUFFER_SIZE || 200)
const isDev = process.env.NODE_ENV !== 'production'

// Ring buffer (best-effort in serverless; guaranteed locally/long-lived node)
const ring: EventRecord[] = []
let ptr = 0

function sanitize(input: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!input || typeof input !== 'object') return out
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    // Drop likely-PII keys and only allow primitive scalars
    if (/email|e-mail|phone|tel|name|user|password|token|auth/i.test(k)) continue
    if (typeof v === 'string') {
      out[k] = v.length > 256 ? v.slice(0, 256) : v
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    }
    // arrays/objects intentionally ignored to reduce risk
  }
  return out
}

function push(e: EventRecord) {
  if (ring.length < BUFFER_SIZE) {
    ring.push(e)
  } else {
    ring[ptr] = e
    ptr = (ptr + 1) % BUFFER_SIZE
  }
}

// Exposed to _debug route
export function getLast(n: number): EventRecord[] {
  const len = ring.length
  if (n >= len) {
    // return chronologically
    if (len < BUFFER_SIZE) return [...ring]
    // full ring: start from ptr
    const a = ring.slice(ptr)
    const b = ring.slice(0, ptr)
    return [...a, ...b]
  }
  // partial tail
  const all = len < BUFFER_SIZE ? [...ring] : [...ring.slice(ptr), ...ring.slice(0, ptr)]
  return all.slice(Math.max(0, all.length - n))
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const { name, props } = (body || {}) as { name?: unknown; props?: unknown }
  if (typeof name !== 'string' || !/^[a-z0-9_:. -]{1,64}$/i.test(name)) {
    return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 })
  }

  const safe = sanitize(props)

  if (isDev) {
    // In dev: log to console, do not retain
    // eslint-disable-next-line no-console
    console.log([track] , safe)
  } else {
    push({ ts: Date.now(), name, props: safe })
  }

  return NextResponse.json({ ok: true })
}
