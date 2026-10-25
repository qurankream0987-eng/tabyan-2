import { describe, expect, it } from "vitest";
import { getWordPresentationStyle } from "./word-presentation";

describe("QCF word presentation", () => {
  it("uses maroon text only for the current AI word", () => {
    const style = getWordPresentationStyle(1, true, false);

    expect(style).toMatchObject({ color: "var(--mushaf-current, var(--maroon))", opacity: 1 });
    expect(style).not.toHaveProperty("background");
    expect(style).not.toHaveProperty("boxShadow");
  });

  it("returns previous/revealed words to inherited QCF color", () => {
    const style = getWordPresentationStyle(1, false, false);

    expect(style).toBeUndefined();
  });

  it("keeps upcoming hidden words transparent without changing their geometry", () => {
    const style = getWordPresentationStyle(0, false, false);

    expect(style).toMatchObject({ opacity: 0 });
    expect(style).not.toHaveProperty("color");
    expect(style).not.toHaveProperty("background");
    expect(style).not.toHaveProperty("boxShadow");
  });

  it("does not add geometry-changing properties while revealing a word", () => {
    const style = getWordPresentationStyle(0, false, false);

    expect(style).toMatchObject({ opacity: 0, transition: "opacity 220ms ease" });
    for (const property of ["display", "padding", "margin", "width", "transform", "letterSpacing"]) {
      expect(style).not.toHaveProperty(property);
    }
  });

  it("keeps the audio player highlight separate from AI current-word tracking", () => {
    const audioStyle = getWordPresentationStyle(1, false, true);
    const trackingStyle = getWordPresentationStyle(1, true, true);

    expect(audioStyle).toHaveProperty("background");
    expect(trackingStyle).not.toHaveProperty("background");
  });
});
describe("Tabyan AI word feedback presentation", () => {
  const GEOMETRY = ["padding", "margin", "transform", "display", "fontSize", "letterSpacing", "width", "height", "border", "boxShadow"];

  it.each(["HEARD_PENDING", "POSSIBLE_ERROR", "CONFIRMED_ERROR", "CORRECTED", "PEEKED", "SKIPPED"] as const)(
    "%s is paint-only and never changes QCF geometry",
    (state) => {
      const style = getWordPresentationStyle(1, false, false, state)!;
      expect(style).toBeDefined();
      for (const property of GEOMETRY) expect(style).not.toHaveProperty(property);
      expect(style.textDecorationLine).toBe("underline");
    },
  );

  it("distinguishes states by underline pattern, not colour alone", () => {
    const pattern = (state: Parameters<typeof getWordPresentationStyle>[3]) =>
      getWordPresentationStyle(1, false, false, state)!.textDecorationStyle;
    const patterns = (["CONFIRMED_ERROR", "POSSIBLE_ERROR", "CORRECTED", "PEEKED", "SKIPPED"] as const).map(pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
    expect(pattern("CONFIRMED_ERROR")).toBe("solid");
    expect(pattern("POSSIBLE_ERROR")).toBe("dotted");
    expect(pattern("PEEKED")).toBe("dashed");
  });

  it("CORRECT is a faint ink tint only — no underline, no geometry", () => {
    const style = getWordPresentationStyle(1, false, false, "CORRECT")!;
    expect(style.color).toContain("--mushaf-correct");
    expect(style).not.toHaveProperty("textDecorationLine");
    expect(style).not.toHaveProperty("textUnderlineOffset");
  });

  it("current word focus wins over the CORRECT tint but not over an error underline", () => {
    expect(getWordPresentationStyle(1, true, false, "CORRECT")!.color).toContain("--mushaf-current");
    expect(getWordPresentationStyle(1, true, false, "CONFIRMED_ERROR")!.color).toContain("--mushaf-error");
  });

  it("keeps a possible error visually softer than a confirmed error", () => {
    expect(getWordPresentationStyle(1, false, false, "POSSIBLE_ERROR")).not.toHaveProperty("color");
    expect(getWordPresentationStyle(1, false, false, "CONFIRMED_ERROR")!.color).toContain("--tby-feedback-error");
  });
});
