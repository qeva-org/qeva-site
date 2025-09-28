import { NextRequest, NextResponse } from "next/server"
import { pushEvent } from "./store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const isDev = process.env.NODE_ENV !== "production"

function sanitize(input: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!input || typeof input !== "object") return out
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (/email|e-mail|phone|tel|name|user|password|token|auth/i.test(k)) continue
    if (typeof v === "string") {
      out[k] = v.length > 256 ? v.slice(0, 256) : v
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v
    }
  }
  return out
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  const { name, props } = (body || {}) as { name?: unknown; props?: unknown }
  if (typeof name !== "string" || !/^[a-z0-9_:. -]{1,64}$/i.test(name)) {
    return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 })
  }

  const safe = sanitize(props)

  if (isDev) {
    // In dev: log to console, do not retain
    // eslint-disable-next-line no-console
    console.log(`[track] ${name}`, safe)
  } else {
    pushEvent({ ts: Date.now(), name, props: safe })
  }

  return NextResponse.json({ ok: true })
}
