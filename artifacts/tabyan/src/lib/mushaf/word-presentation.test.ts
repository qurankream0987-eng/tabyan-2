import { describe, expect, it } from "vitest";
import { getWordPresentationStyle } from "./word-presentation";

describe("QCF word presentation", () => {
  it("uses maroon text only for the current AI word", () => {
    const style = getWordPresentationStyle(1, true, false);

    expect(style).toMatchObject({ color: "var(--maroon)", opacity: 1 });
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