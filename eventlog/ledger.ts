// eventlog/ledger.ts
// Append-only event log with pluggable storage (IndexedDB in-browser; memory fallback).
// API: append(event), list({limit?, since?}), exportNDJSON(stream)

export type LedgerEvent = {
  ts: number;                 // unix ms
  url: string;
  title: string;
  selection?: string;
  goalState: any;
  action?: string;
  artifactDiff?: any;
};

export type StoredEvent = LedgerEvent & { seq: number };

export type ListOptions = {
  limit?: number;             // max items to return (oldest-first)
  since?: number;             // inclusive ts filter (>=)
};

export interface EventAdapter {
  append(e: LedgerEvent): Promise<StoredEvent>;
  list(opts?: ListOptions): Promise<StoredEvent[]>;
  clear?(): Promise<void>;    // optional, for tests
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function validateEvent(e: unknown): asserts e is LedgerEvent {
  if (!isRecord(e)) throw new TypeError("Event must be an object");
  if (typeof e.ts !== "number" || !Number.isFinite(e.ts)) {
    throw new TypeError("Event.ts must be a finite number (ms since epoch)");
  }
  if (typeof e.url !== "string" || typeof e.title !== "string") {
    throw new TypeError("Event.url and Event.title must be strings");
  }
  if (!("goalState" in e)) {
    throw new TypeError("Event.goalState is required");
  }
  if ("selection" in e && e.selection != null && typeof e.selection !== "string") {
    throw new TypeError("Event.selection must be a string if present");
  }
  if ("action" in e && e.action != null && typeof e.action !== "string") {
    throw new TypeError("Event.action must be a string if present");
  }
  // artifactDiff/goalState are intentionally 'any'
}

function deepClone<T>(x: T): T {
  // Robust enough for our payloads; avoids accidental mutation by callers.
  return x === undefined ? x : JSON.parse(JSON.stringify(x));
}

/* ---------------- In-memory adapter (SSR-safe, used in tests) ---------------- */

export class MemoryAdapter implements EventAdapter {
  private seq = 0;
  private items: StoredEvent[] = [];

  async append(e: LedgerEvent): Promise<StoredEvent> {
    validateEvent(e);
    const stored: StoredEvent = { seq: ++this.seq, ...deepClone(e) };
    this.items.push(stored);
    return stored;
  }

  async list(opts?: ListOptions): Promise<StoredEvent[]> {
    const since = opts?.since;
    const limit = opts?.limit ?? 0;
    const filtered = since == null
      ? this.items.slice()
      : this.items.filter(ev => ev.ts >= since);
    return limit > 0 ? filtered.slice(0, limit) : filtered;
  }

  async clear(): Promise<void> {
    this.seq = 0;
    this.items = [];
  }
}

/* ---------------- IndexedDB adapter (browser only) ---------------- */

export class IDBAdapter implements EventAdapter {
  private dbPromise: Promise<any> | null = null;
  private readonly dbName = "QevaEventLog";
  private readonly storeName = "events";
  private readonly version = 1;

  private get hasIDB(): boolean {
    return typeof globalThis !== "undefined" && !!(globalThis as any).indexedDB;
  }

  private openDb(): Promise<any> {
    if (!this.hasIDB) {
      return Promise.reject(new Error("IndexedDB not available"));
    }
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = (globalThis as any).indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "seq",
            autoIncrement: true,
          });
          store.createIndex("ts", "ts", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IDB open failed"));
    });
    return this.dbPromise;
  }

  async append(e: LedgerEvent): Promise<StoredEvent> {
    validateEvent(e);
    const db = await this.openDb();
    return new Promise<StoredEvent>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const data = deepClone(e);
      const addReq = store.add(data);
      addReq.onsuccess = () => {
        const seq = addReq.result as number;
        resolve({ seq, ...data });
      };
      addReq.onerror = () => reject(addReq.error || new Error("IDB add failed"));
    });
  }

  async list(opts?: ListOptions): Promise<StoredEvent[]> {
    const db = await this.openDb();
    const since = opts?.since;
    const limit = opts?.limit ?? 0;
    return new Promise<StoredEvent[]>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const out: StoredEvent[] = [];
      const cursorReq = store.openCursor(); // ascending by seq
      cursorReq.onerror = () => reject(cursorReq.error || new Error("IDB cursor error"));
      cursorReq.onsuccess = (ev: any) => {
        const cursor = ev.target.result as any;
        if (!cursor) return resolve(out);
        const val = cursor.value as LedgerEvent;
        const seq = cursor.primaryKey as number ?? cursor.key as number;
        if (since == null || val.ts >= since) {
          out.push({ seq, ...val });
          if (limit > 0 && out.length >= limit) return resolve(out);
        }
        cursor.continue();
      };
    });
  }
}

/* ---------------- Ledger facade ---------------- */

export class Ledger {
  private adapter: EventAdapter;

  constructor(adapter?: EventAdapter) {
    // Prefer IDB in browser, otherwise memory.
    if (adapter) {
      this.adapter = adapter;
    } else {
      const canIDB =
        typeof globalThis !== "undefined" &&
        !!(globalThis as any).indexedDB &&
        typeof window !== "undefined";
      this.adapter = canIDB ? new IDBAdapter() : new MemoryAdapter();
    }
  }

  append(e: LedgerEvent): Promise<StoredEvent> {
    return this.adapter.append(e);
  }

  list(opts?: ListOptions): Promise<StoredEvent[]> {
    return this.adapter.list(opts);
  }

  /**
   * Export events as NDJSON to a writable target.
   * Accepts any object with a `write(string)` method (Node stream or custom sink).
   * Calls `end()` if present after writing all lines.
   */
  async exportNDJSON(
    stream: { write: (chunk: string) => any; end?: () => void }
  ): Promise<void> {
    const events = await this.adapter.list();
    for (const ev of events) {
      const line = JSON.stringify(ev) + "\n";
      const ok = stream.write(line);
      // If backpressure is signaled (Node), optionally wait for 'drain' externally;
      // here we keep it simple and trust the caller / small payloads.
      void ok;
    }
    if (typeof stream.end === "function") stream.end();
  }
}

// Convenience factory (auto-selects adapter)
export function createLedger(adapter?: EventAdapter): Ledger {
  return new Ledger(adapter);
}
