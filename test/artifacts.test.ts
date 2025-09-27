// test/artifacts.test.ts
import { describe, it, expect } from "vitest";
import { validateArtifact } from "../src/artifacts";
import { okSlideDeck, okOnePager, okFlashcards } from "../src/examples";

describe("Artifact Compiler contract", () => {
  it("accepts valid minimal SlideDeck", () => {
    const before = JSON.stringify(okSlideDeck);
    const res = validateArtifact(okSlideDeck);
    const after = JSON.stringify(okSlideDeck);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(after).toBe(before); // purity: no mutation
  });

  it("rejects SlideDeck with slideCount mismatch and unknown citation", () => {
    const bad = structuredClone(okSlideDeck);
    bad.meta.slideCount = 3; // mismatch
    bad.slides[0].citations = ["s999"]; // unknown
    const res = validateArtifact(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.includes("slideCount mismatch"))).toBe(true);
    expect(res.errors.some(e => e.includes("unknown citation id"))).toBe(true);
  });

  it("accepts valid minimal OnePager", () => {
    const res = validateArtifact(okOnePager);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("rejects OnePager exceeding wordBudget and with bad citation", () => {
    const bad = structuredClone(okOnePager);
    bad.meta.wordBudget = 10; // force overflow
    bad.citations = ["s404"]; // bad id
    const res = validateArtifact(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.includes("wordBudget exceeded"))).toBe(true);
    expect(res.errors.some(e => e.includes("unknown citation ids"))).toBe(true);
  });

  it("accepts valid minimal Flashcards", () => {
    const res = validateArtifact(okFlashcards);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("rejects Flashcards without any cited card and with overlong answer", () => {
    const bad = structuredClone(okFlashcards);
    bad.cards = bad.cards.map(c => ({ ...c, citations: [] })); // clear all citations
    bad.cards[0].a = Array.from({ length: 61 }, () => "w").join(" "); // 61 words
    const res = validateArtifact(bad);
    expect(res.ok).toBe(false);
    expect(res.errors.some(e => e.includes("at least one card must include a citation"))).toBe(true);
    expect(res.errors.some(e => e.includes("exceeds 60 words"))).toBe(true);
  });

  it("calculator is deterministic and side-effect-free", () => {
    const input = okSlideDeck;
    const r1 = validateArtifact(input);
    const r2 = validateArtifact(structuredClone(input));
    expect(r1).toEqual(r2);
    expect(JSON.stringify(input)).toEqual(JSON.stringify(okSlideDeck));
  });
});
