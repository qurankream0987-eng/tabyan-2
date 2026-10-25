import assert from "node:assert/strict";
import test from "node:test";
import {
  parseNabrQrcConfig,
  readNabrQrcCredential,
} from "./nabr-qrc-config";

test("QRC defaults are disabled and dry-run", () => {
  assert.deepEqual(parseNabrQrcConfig({}), {
    enabled: false,
    dryRun: true,
    shadowMode: false,
  });
});

test("API key is not read unless QRC is both enabled and not dry-run", () => {
  let reads = 0;
  const environment = new Proxy({
    NABR_QRC_ENABLED: "false",
    NABR_QRC_DRY_RUN: "false",
    NABR_QRC_API_KEY: "unit-test-secret",
  }, {
    get(target, property, receiver) {
      if (property === "NABR_QRC_API_KEY") reads += 1;
      return Reflect.get(target, property, receiver);
    },
  });

  assert.deepEqual(
    readNabrQrcCredential(environment, parseNabrQrcConfig(environment)),
    {},
  );
  assert.equal(reads, 0);

  environment.NABR_QRC_ENABLED = "true";
  environment.NABR_QRC_DRY_RUN = "true";
  assert.deepEqual(
    readNabrQrcCredential(environment, parseNabrQrcConfig(environment)),
    {},
  );
  assert.equal(reads, 0);

  environment.NABR_QRC_DRY_RUN = "false";
  assert.deepEqual(
    readNabrQrcCredential(environment, parseNabrQrcConfig(environment)),
    { apiKey: "unit-test-secret" },
  );
  assert.equal(reads, 1);
});

test("malformed QRC flags fail closed", () => {
  assert.deepEqual(parseNabrQrcConfig({
    NABR_QRC_ENABLED: "yes",
    NABR_QRC_DRY_RUN: "false",
  }), {
    enabled: false,
    dryRun: true,
    shadowMode: false,
  });
});

test("shadow mode is explicit and defaults off in parsed config", () => {
  assert.equal(parseNabrQrcConfig({ NABR_QRC_SHADOW_MODE: "true" }).shadowMode, true);
  assert.equal(parseNabrQrcConfig({ NABR_QRC_SHADOW_MODE: "false" }).shadowMode, false);
});
