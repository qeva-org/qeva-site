// src/artifacts.ts
import Ajv, { DefinedError } from "ajv/dist/2020";
import addFormats from "ajv-formats";

// === JSON Schemas (inlined for a self-contained module) ===
export const SlideDeckSchema = /* json */ (/* keep exact match to JSON file */{
  "$id": "https://qeva.org/schemas/SlideDeck.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SlideDeck",
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "meta", "slides", "sources"],
  "properties": {
    "kind": { "const": "SlideDeck" },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title", "slideCount"],
      "properties": {
        "title": { "type": "string", "minLength": 1, "maxLength": 160 },
        "slideCount": { "type": "integer", "minimum": 1, "maximum": 30 }
      }
    },
    "slides": {
      "type": "array",
      "minItems": 1,
      "maxItems": 30,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title"],
        "properties": {
          "title": { "type": "string", "minLength": 1, "maxLength": 120 },
          "bullets": {
            "type": "array",
            "minItems": 0,
            "maxItems": 5,
            "items": { "type": "string", "minLength": 1, "maxLength": 400 }
          },
          "figureStubs": {
            "type": "array",
            "minItems": 0,
            "maxItems": 3,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["stub"],
              "properties": {
                "stub": { "type": "string", "minLength": 1, "maxLength": 200 },
                "caption": { "type": "string", "minLength": 0, "maxLength": 200 }
              }
            }
          },
          "citations": {
            "type": "array",
            "items": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" },
            "minItems": 0,
            "maxItems": 10
          },
          "notes": { "type": "string", "minLength": 0, "maxLength": 1000 }
        },
        "anyOf": [
          { "type": "object", "required": ["bullets"], "properties": { "bullets": { "type": "array", "minItems": 1 } } },
          { "type": "object", "required": ["figureStubs"], "properties": { "figureStubs": { "type": "array", "minItems": 1 } } }
        ]
      }
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": { "$ref": "#/$defs/source" }
    }
  },
  "$defs": {
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "kind", "value"],
      "properties": {
        "id": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" },
        "kind": { "type": "string", "enum": ["url", "doi", "paper", "book", "other"] },
        "value": { "type": "string", "minLength": 1 },
        "title": { "type": "string" },
        "accessed": { "type": "string", "format": "date" }
      }
    }
  }
}) as const;

export const OnePagerSchema = /* json */({
  "$id": "https://qeva.org/schemas/OnePager.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OnePager",
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "meta", "problem", "keyFacts", "implications", "actions", "citations", "sources"],
  "properties": {
    "kind": { "const": "OnePager" },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title", "wordBudget"],
      "properties": {
        "title": { "type": "string", "minLength": 1, "maxLength": 160 },
        "wordBudget": { "type": "integer", "minimum": 200, "maximum": 1000 }
      }
    },
    "problem": { "type": "string", "minLength": 1, "maxLength": 4000 },
    "keyFacts": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": { "type": "string", "minLength": 1, "maxLength": 400 }
    },
    "implications": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": { "type": "string", "minLength": 1, "maxLength": 400 }
    },
    "actions": {
      "type": "array",
      "minItems": 0,
      "maxItems": 10,
      "items": { "type": "string", "minLength": 1, "maxLength": 200 }
    },
    "citations": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" }
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": { "$ref": "#/$defs/source" }
    }
  },
  "$defs": {
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "kind", "value"],
      "properties": {
        "id": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" },
        "kind": { "type": "string", "enum": ["url", "doi", "paper", "book", "other"] },
        "value": { "type": "string", "minLength": 1 },
        "title": { "type": "string" },
        "accessed": { "type": "string", "format": "date" }
      }
    }
  }
}) as const;

export const FlashcardsSchema = /* json */({
  "$id": "https://qeva.org/schemas/Flashcards.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Flashcards",
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "cards", "sources"],
  "properties": {
    "kind": { "const": "Flashcards" },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "minLength": 1, "maxLength": 160 }
      }
    },
    "cards": {
      "type": "array",
      "minItems": 3,
      "maxItems": 50,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["q", "a"],
        "properties": {
          "q": { "type": "string", "minLength": 1, "maxLength": 400 },
          "a": { "type": "string", "minLength": 1, "maxLength": 1200 },
          "tags": {
            "type": "array",
            "minItems": 0,
            "maxItems": 5,
            "items": { "type": "string", "minLength": 1, "maxLength": 40 }
          },
          "citations": {
            "type": "array",
            "minItems": 0,
            "maxItems": 10,
            "items": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" }
          }
        }
      }
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": { "$ref": "#/$defs/source" }
    }
  },
  "$defs": {
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "kind", "value"],
      "properties": {
        "id": { "type": "string", "pattern": "^[A-Za-z0-9._:-]+$" },
        "kind": { "type": "string", "enum": ["url", "doi", "paper", "book", "other"] },
        "value": { "type": "string", "minLength": 1 },
        "title": { "type": "string" },
        "accessed": { "type": "string", "format": "date" }
      }
    }
  }
}) as const;

// === TypeScript structural types inferred from schemas ===
export type Source = {
  id: string; kind: "url"|"doi"|"paper"|"book"|"other"; value: string;
  title?: string; accessed?: string;
};

export type SlideDeck = {
  kind: "SlideDeck";
  meta: { title: string; slideCount: number };
  slides: Array<{
    title: string;
    bullets?: string[];
    figureStubs?: Array<{ stub: string; caption?: string }>;
    citations?: string[];
    notes?: string;
  }>;
  sources: Source[];
};

export type OnePager = {
  kind: "OnePager";
  meta: { title: string; wordBudget: number };
  problem: string;
  keyFacts: string[];
  implications: string[];
  actions: string[];
  citations: string[];
  sources: Source[];
};

export type Flashcards = {
  kind: "Flashcards";
  meta?: { title?: string };
  cards: Array<{ q: string; a: string; tags?: string[]; citations?: string[] }>;
  sources: Source[];
};

export type Artifact = SlideDeck | OnePager | Flashcards;

// === Ajv setup ===
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validateSlideDeck = ajv.compile<SlideDeck>(SlideDeckSchema);
const validateOnePager = ajv.compile<OnePager>(OnePagerSchema);
const validateFlashcards = ajv.compile<Flashcards>(FlashcardsSchema);

// === Deterministic calculator (pure) ===
export type CalcResult = { ok: boolean; errors: string[] };

function wc(s: string | undefined | null): number {
  if (!s) return 0;
  // Split on unicode whitespace; filter empty
  return s.trim().split(/\s+/u).filter(Boolean).length;
}

function uniq<T>(arr: T[]): T[] {
  const seen = new Set<T>(); const out: T[] = [];
  for (const v of arr) { if (!seen.has(v)) { seen.add(v); out.push(v); } }
  return out;
}

function sourceIdSet(sources: Source[]): Set<string> {
  const ids = new Set<string>();
  for (const s of sources) ids.add(s.id);
  return ids;
}

function findDuplicateIds(sources: Source[]): string[] {
  const seen = new Set<string>(), dups = new Set<string>();
  for (const s of sources) { if (seen.has(s.id)) dups.add(s.id); else seen.add(s.id); }
  return Array.from(dups);
}

// --- SlideDeck rules ---
function calcSlideDeck(a: SlideDeck): string[] {
  const errors: string[] = [];
  if (a.meta.slideCount !== a.slides.length) {
    errors.push(`slideCount mismatch: meta.slideCount=${a.meta.slideCount} but slides.length=${a.slides.length}`);
  }
  const srcIds = sourceIdSet(a.sources);
  const dupIds = findDuplicateIds(a.sources);
  if (dupIds.length) errors.push(`duplicate source ids: ${dupIds.join(", ")}`);

  let totalWords = wc(a.meta.title);
  let usedCites = new Set<string>();

  a.slides.forEach((s, i) => {
    const titleWords = wc(s.title);
    if (titleWords > 12) errors.push(`slide[${i}].title exceeds 12 words (${titleWords})`);
    totalWords += titleWords;

    const bullets = s.bullets ?? [];
    if (!bullets.length && !(s.figureStubs && s.figureStubs.length)) {
      errors.push(`slide[${i}] must have bullets or figureStubs`);
    }
    let slideBulletWords = 0;
    bullets.forEach((b, j) => {
      const w = wc(b);
      slideBulletWords += w;
      totalWords += w;
      if (w > 24) errors.push(`slide[${i}].bullets[${j}] exceeds 24 words (${w})`);
    });
    if (slideBulletWords > 60) errors.push(`slide[${i}] bullets budget exceeded (<=60 words, got ${slideBulletWords})`);

    const cites = s.citations ?? [];
    for (const c of cites) {
      if (!srcIds.has(c)) errors.push(`slide[${i}] unknown citation id: ${c}`);
      usedCites.add(c);
    }

    if (s.figureStubs) {
      s.figureStubs.forEach((f, j) => {
        if (!f.stub.trim()) errors.push(`slide[${i}].figureStubs[${j}].stub must be non-empty`);
        totalWords += wc(f.caption);
      });
    }
    totalWords += wc(s.notes);
  });

  if (a.sources.length < 1) errors.push("must include at least one source");
  if (usedCites.size === 0) errors.push("no citations used in slides");
  if (totalWords > 1500) errors.push(`total word budget exceeded (<=1500, got ${totalWords})`);

  return errors;
}

// --- OnePager rules ---
function calcOnePager(a: OnePager): string[] {
  const errors: string[] = [];
  const srcIds = sourceIdSet(a.sources);
  const dupIds = findDuplicateIds(a.sources);
  if (dupIds.length) errors.push(`duplicate source ids: ${dupIds.join(", ")}`);

  let total = wc(a.meta.title) + wc(a.problem);
  if (wc(a.problem) > 120) errors.push(`problem exceeds 120 words (${wc(a.problem)})`);

  a.keyFacts.forEach((s, i) => {
    const w = wc(s); total += w;
    if (w > 30) errors.push(`keyFacts[${i}] exceeds 30 words (${w})`);
  });
  a.implications.forEach((s, i) => {
    const w = wc(s); total += w;
    if (w > 30) errors.push(`implications[${i}] exceeds 30 words (${w})`);
  });
  a.actions.forEach((s, i) => {
    const w = wc(s); total += w;
    if (w > 20) errors.push(`actions[${i}] exceeds 20 words (${w})`);
  });

  // citations present + valid
  if (a.citations.length < 1) errors.push("must include at least one citation");
  const invalid = a.citations.filter(c => !srcIds.has(c));
  if (invalid.length) errors.push(`unknown citation ids: ${uniq(invalid).join(", ")}`);

  if (total > a.meta.wordBudget) {
    errors.push(`wordBudget exceeded (<=${a.meta.wordBudget}, got ${total})`);
  }
  if (a.sources.length < 1) errors.push("must include at least one source");

  return errors;
}

// --- Flashcards rules ---
function calcFlashcards(a: Flashcards): string[] {
  const errors: string[] = [];
  const srcIds = sourceIdSet(a.sources);
  const dupIds = findDuplicateIds(a.sources);
  if (dupIds.length) errors.push(`duplicate source ids: ${dupIds.join(", ")}`);

  let anyCited = false;
  a.cards.forEach((c, i) => {
    const qw = wc(c.q), aw = wc(c.a);
    if (qw > 20) errors.push(`cards[${i}].q exceeds 20 words (${qw})`);
    if (aw > 60) errors.push(`cards[${i}].a exceeds 60 words (${aw})`);
    const cites = c.citations ?? [];
    if (cites.length) anyCited = true;
    for (const id of cites) {
      if (!srcIds.has(id)) errors.push(`cards[${i}] unknown citation id: ${id}`);
    }
  });

  if (!anyCited) errors.push("at least one card must include a citation");
  if (a.sources.length < 1) errors.push("must include at least one source");

  return errors;
}

// === Public API ===

/** Validate structure against JSON Schema, then run deterministic calculator. */
export function validateArtifact(artifact: unknown): CalcResult {
  // Pure function: do not mutate input
  const a = artifact as Artifact;

  let schemaOk = false;
  let ajvErrors: string[] = [];

  if (typeof a === "object" && a && "kind" in a) {
    const k = (a as any).kind;
    if (k === "SlideDeck") { schemaOk = validateSlideDeck(a); ajvErrors = asErrs(validateSlideDeck.errors); }
    else if (k === "OnePager") { schemaOk = validateOnePager(a); ajvErrors = asErrs(validateOnePager.errors); }
    else if (k === "Flashcards") { schemaOk = validateFlashcards(a); ajvErrors = asErrs(validateFlashcards.errors); }
    else { return { ok: false, errors: [`unknown kind: ${String(k)}`] }; }
  } else {
    return { ok: false, errors: ["artifact must be an object with a 'kind' field"] };
  }

  const runCalc = (): string[] => {
    switch ((a as Artifact).kind) {
      case "SlideDeck":
        return calcSlideDeck(a as SlideDeck);
      case "OnePager":
        return calcOnePager(a as OnePager);
      case "Flashcards":
        return calcFlashcards(a as Flashcards);
      default:
        return [];
    }
  };

  const calcErrors = (() => {
    try {
      return runCalc();
    } catch {
      return [];
    }
  })();

  if (!schemaOk) {
    const mergedErrors = [...ajvErrors, ...calcErrors];
    return { ok: false, errors: mergedErrors };
  }

  return { ok: calcErrors.length === 0, errors: calcErrors };
}

function asErrs(e: null | undefined | DefinedError[]): string[] {
  if (!e || !e.length) return [];
  return e.map(err => {
    const instPath = err.instancePath || "";
    const where = instPath ? `at ${instPath}` : "";
    return `${err.keyword} ${where} ${JSON.stringify(err.params)}`.trim();
  });
}

