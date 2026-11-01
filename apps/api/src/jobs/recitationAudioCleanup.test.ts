import assert from "node:assert/strict";
import { test } from "node:test";
import { recitationAudioSessionId, recitationAudioToDelete } from "./recitationAudioRetention";

test("only submitted or still-submittable recordings are kept", () => {
  const all = ["submitted", "replaced", "fresh-attempt", "cancelled-or-deleted"];
  const submitted = new Set(["submitted"]);
  const recent = new Set(["fresh-attempt"]);
  assert.deepEqual(recitationAudioToDelete(all, submitted, recent), ["replaced", "cancelled-or-deleted"]);
});

test("session ids are read only from recitation audio paths", () => {
  assert.equal(recitationAudioSessionId("/objects/uploads/recitation-audio/abc-123"), "abc-123");
  assert.equal(recitationAudioSessionId("/objects/uploads/other/abc-123"), null);
  assert.equal(recitationAudioSessionId("/objects/uploads/recitation-audio/a/b"), null);
});
