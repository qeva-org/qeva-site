// src/examples.ts
import type { SlideDeck, OnePager, Flashcards } from "./artifacts";

export const okSlideDeck: SlideDeck = {
  kind: "SlideDeck",
  meta: { title: "Sample Deck", slideCount: 2 },
  slides: [
    { title: "Intro", bullets: ["Purpose and scope"], citations: ["s1"] },
    { title: "Conclusion", bullets: ["Next steps"], citations: ["s1"] }
  ],
  sources: [{ id: "s1", kind: "url", value: "https://example.com", title: "Example", accessed: "2025-09-27" }]
};

export const okOnePager: OnePager = {
  kind: "OnePager",
  meta: { title: "Project One-Pager", wordBudget: 500 },
  problem: "We need a concise artifact with clear constraints.",
  keyFacts: ["Validated by schema-first checks"],
  implications: ["Reduces review time"],
  actions: ["Ship MVP"],
  citations: ["s1"],
  sources: [{ id: "s1", kind: "doi", value: "10.1000/example" }]
};

export const okFlashcards: Flashcards = {
  kind: "Flashcards",
  meta: { title: "Key Terms" },
  cards: [
    { q: "What is a schema?", a: "A formal contract describing data shape.", citations: ["s1"] },
    { q: "What is determinism?", a: "Same inputs, same outputs." },
    { q: "Purpose of citations?", a: "Traceability and auditability." }
  ],
  sources: [{ id: "s1", kind: "paper", value: "Smith et al. 2024" }]
};
