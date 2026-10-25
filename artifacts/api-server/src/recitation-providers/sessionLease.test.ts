import assert from "node:assert/strict";
import test from "node:test";
import { RecitationSessionLeases, RECITATION_IDLE_MS, RECITATION_MAX_CONNECTION_MS } from "./sessionLease";

test("one provider lease per student; repeated sockets/different sessions cannot run in parallel", () => {
  const leases = new RecitationSessionLeases();
  const first = Symbol(), duplicate = Symbol();
  assert.equal(leases.acquire("student-a", "session-a", first), true);
  assert.equal(leases.acquire("student-a", "session-a", duplicate), false);
  assert.equal(leases.acquire("student-a", "session-b", duplicate), false);
  assert.equal(leases.acquire("student-b", "session-c", duplicate), true);
});

test("failure/navigation release allows retry; stale cleanup cannot release new owner", () => {
  const leases = new RecitationSessionLeases();
  const old = Symbol(), retry = Symbol();
  leases.acquire("a", "session", old);
  leases.release("a", old);
  assert.equal(leases.acquire("a", "session", retry), true);
  leases.release("a", old);
  assert.equal(leases.acquire("a", "session", Symbol()), false);
  leases.release("a", retry);
  assert.equal(leases.acquire("a", "session", Symbol()), true);
});

test("transport policy has finite idle and session caps, no monetary quota", () => {
  assert.equal(RECITATION_IDLE_MS, 120_000);
  assert.equal(RECITATION_MAX_CONNECTION_MS, 7_200_000);
});
