import assert from "node:assert/strict";
import test from "node:test";
import type { NabrQrcConfig } from "./nabr-qrc-config";
import { nabrQrcStartInputForSession } from "./nabr-qrc-session";

const config: NabrQrcConfig = {
  enabled: true,
  dryRun: true,
  hafzLevel: 2,
  tajweedLevel: 3,
};

test("general QRC start coordinates come from the stored start context", () => {
  assert.deepEqual(nabrQrcStartInputForSession({
    mode: "general",
    startVerseKey: "2:255",
    startWordPosition: 4,
    expectedRange: null,
  }, config), {
    chapterIndex: 2,
    verseIndex: 255,
    wordIndex: 4,
    hafzLevel: 2,
    tajweedLevel: 3,
  });
});

test("educational QRC start coordinates come only from the assigned range", () => {
  assert.deepEqual(nabrQrcStartInputForSession({
    mode: "educational",
    startVerseKey: "1:1",
    startWordPosition: 7,
    expectedRange: {
      start: { surahId: 3, ayah: 10, wordPosition: 2 },
    },
  }, config), {
    chapterIndex: 3,
    verseIndex: 10,
    wordIndex: 2,
    hafzLevel: 2,
    tajweedLevel: 3,
  });
});

test("missing or invalid server-owned coordinates and levels fail closed", () => {
  assert.equal(nabrQrcStartInputForSession({
    mode: "general",
    startVerseKey: null,
    startWordPosition: null,
    expectedRange: null,
  }, config), null);
  assert.equal(nabrQrcStartInputForSession({
    mode: "educational",
    startVerseKey: null,
    startWordPosition: null,
    expectedRange: null,
  }, config), null);
  assert.equal(nabrQrcStartInputForSession({
    mode: "general",
    startVerseKey: "115:1",
    startWordPosition: 1,
    expectedRange: null,
  }, config), null);
  assert.equal(nabrQrcStartInputForSession({
    mode: "general",
    startVerseKey: "1:1",
    startWordPosition: null,
    expectedRange: null,
  }, { enabled: true, dryRun: true }), null);
});
