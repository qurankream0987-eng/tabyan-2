import assert from "node:assert/strict";
import test from "node:test";
import { NabrQrcOneShotTestGate } from "./nabr-qrc-one-shot-test";
import type { NabrQrcSessionContext } from "./nabr-qrc-session";

const fatihaStart: NabrQrcSessionContext = {
  mode: "general",
  startVerseKey: "1:1",
  startWordPosition: 1,
  expectedRange: null,
};

test("one-shot test gate accepts only one GENERAL session starting at Al-Fatiha 1:1 word 1", () => {
  const gate = new NabrQrcOneShotTestGate();
  assert.equal(gate.claim({ ...fatihaStart, startVerseKey: "2:1" }), false);
  assert.equal(gate.claim({ ...fatihaStart, startWordPosition: 2 }), false);
  assert.equal(gate.claim({ ...fatihaStart, mode: "educational" }), false);
  assert.equal(gate.claim(fatihaStart), true);
  assert.equal(gate.claim(fatihaStart), false);
});

test("a qualifying one-shot attempt is consumed even if the provider later fails", () => {
  const gate = new NabrQrcOneShotTestGate();
  assert.equal(gate.claim(fatihaStart), true);
  assert.equal(gate.claim(fatihaStart), false);
});
