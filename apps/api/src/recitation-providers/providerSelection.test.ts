import assert from "node:assert/strict";
import test from "node:test";
import { selectSpeechRecognitionProvider } from "./providerSelection";

test("Tarteel is opt-in for development only", () => {
  assert.equal(selectSpeechRecognitionProvider({
    provider: "tarteel",
    nodeEnv: "development",
    tarteelTrialEnabled: "true",
  }), "tarteel");
  assert.equal(selectSpeechRecognitionProvider({
    provider: "tarteel",
    nodeEnv: "development",
    tarteelTrialEnabled: undefined,
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    provider: "tarteel",
    nodeEnv: "production",
    tarteelTrialEnabled: "true",
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    provider: "tarteel",
    nodeEnv: "test",
    tarteelTrialEnabled: "true",
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    provider: "tarteel",
    nodeEnv: undefined,
    tarteelTrialEnabled: "true",
  }), null);
});

test("existing provider selection remains unchanged", () => {
  for (const provider of ["openai", "nvidia", "speechmatics", "tilawi"] as const) {
    assert.equal(selectSpeechRecognitionProvider({
      provider,
      nodeEnv: "production",
      tarteelTrialEnabled: undefined,
      nabrEnabled: "true",
    }), provider);
  }
  assert.equal(selectSpeechRecognitionProvider({
    provider: "unknown",
    nodeEnv: "development",
    tarteelTrialEnabled: undefined,
  }), null);
});

test("Nabr is selectable only by development provider name and all explicit one-shot shadow gates", () => {
  const base = {
    provider: "nabr",
    nodeEnv: "development",
    tarteelTrialEnabled: undefined,
  };
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nabrEnabled: "true",
    nabrShadowMode: undefined,
    nabrOneShotTest: "true",
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nabrEnabled: undefined,
    nabrShadowMode: "true",
    nabrOneShotTest: "true",
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nabrEnabled: "false",
    nabrShadowMode: "true",
    nabrOneShotTest: "true",
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nabrEnabled: "true",
    nabrShadowMode: "false",
    nabrOneShotTest: "true",
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nabrEnabled: "true",
    nabrShadowMode: "true",
    nabrOneShotTest: undefined,
  }), null);
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nabrEnabled: "true",
    nabrShadowMode: "true",
    nabrOneShotTest: "true",
  }), "nabr");
  assert.equal(selectSpeechRecognitionProvider({
    ...base,
    nodeEnv: "production",
    nabrEnabled: "true",
    nabrShadowMode: "true",
    nabrOneShotTest: "true",
  }), null);
});

test("production OpenAI selection stays OpenAI when Nabr is enabled but not selected", () => {
  assert.equal(selectSpeechRecognitionProvider({
    provider: "openai",
    nodeEnv: "production",
    tarteelTrialEnabled: undefined,
    nabrEnabled: "true",
    nabrShadowMode: "true",
  }), "openai");
});