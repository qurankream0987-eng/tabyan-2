import assert from "node:assert/strict";
import test from "node:test";
import {
  RecitationSessionLeases,
  RECITATION_HEARTBEAT_TIMEOUT_MS,
  RECITATION_IDLE_MS,
  RECITATION_MAX_CONNECTION_MS,
} from "./sessionLease";

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

test("a reconnect for the same session replaces the stale socket; another session still cannot", () => {
  const leases = new RecitationSessionLeases();
  const stale = Symbol(), reconnect = Symbol(), other = Symbol();
  let replaced = 0;
  assert.equal(leases.acquire("a", "session", stale, () => { replaced += 1; leases.release("a", stale); }), true);
  assert.equal(leases.acquire("a", "other-session", other, () => {}), false);
  assert.equal(replaced, 0);
  assert.equal(leases.acquire("a", "session", reconnect, () => {}), true);
  assert.equal(replaced, 1);
  leases.release("a", stale);
  assert.equal(leases.acquire("a", "other-session", other), false);
  leases.release("a", reconnect);
  assert.equal(leases.acquire("a", "other-session", other), true);
});

test("dead sockets are detected well before the idle cap", () => {
  assert.ok(RECITATION_HEARTBEAT_TIMEOUT_MS < RECITATION_IDLE_MS);
});
