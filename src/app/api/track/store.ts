export type EventRecord = {
  ts: number
  name: string
  props: Record<string, unknown>
}

const BUFFER_SIZE = Number(process.env.TELEMETRY_BUFFER_SIZE || 200)

const ring: EventRecord[] = []
let ptr = 0

export function pushEvent(record: EventRecord) {
  if (ring.length < BUFFER_SIZE) {
    ring.push(record)
  } else {
    ring[ptr] = record
    ptr = (ptr + 1) % BUFFER_SIZE
  }
}

export function getLastEvents(n: number): EventRecord[] {
  const len = ring.length
  if (n >= len) {
    if (len < BUFFER_SIZE) return [...ring]
    const a = ring.slice(ptr)
    const b = ring.slice(0, ptr)
    return [...a, ...b]
  }
  const all = len < BUFFER_SIZE ? [...ring] : [...ring.slice(ptr), ...ring.slice(0, ptr)]
  return all.slice(Math.max(0, all.length - n))
}
