import { NextRequest, NextResponse } from 'next/server'
import { getLastEvents } from '../store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const nParam = url.searchParams.get('n')
  const n = Math.max(1, Math.min(1000, nParam ? Number(nParam) : 50))
  const events = getLastEvents(n)
  return NextResponse.json({ count: events.length, events })
}
