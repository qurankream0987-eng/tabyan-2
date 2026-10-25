import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyProviderError } from "./provider-error-classification";

test("provider error classification emits safe categories, never the raw message", () => {
  const privateDetail = "insufficient_quota account=student-123 sk-example-secret";
  const result = classifyProviderError(privateDetail);

  assert.equal(result, "quota_or_billing");
  assert.equal(JSON.stringify(result).includes("student-123"), false);
  assert.equal(JSON.stringify(result).includes("sk-example-secret"), false);
});

test("unknown provider errors stay generic", () => {
  assert.equal(classifyProviderError("backend path /private/request/42"), "provider_error");
});
