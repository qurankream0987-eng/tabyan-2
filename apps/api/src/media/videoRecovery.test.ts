import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyVideoObjects,
  embeddedObjectPath,
  isCanonicalReference,
  redactReference,
  type ObjectFacts,
  type StoredReference,
} from "./videoRecovery";

const key = "/objects/uploads/25cdc175-8d09-4abb-91dc-0e6e9e3b8ca1";

test("legacy URL forms resolve to the durable object key", () => {
  assert.equal(embeddedObjectPath(key), key);
  assert.equal(embeddedObjectPath(`/api/storage${key}?token=old-session`), key);
  assert.equal(embeddedObjectPath(`https://tibyanquran.com/api/storage${key}?token=x&diag=y`), key);
  assert.equal(
    embeddedObjectPath("https://storage.googleapis.com/replit-objstore-abc/.private/uploads/25cdc175-8d09-4abb-91dc-0e6e9e3b8ca1?X-Goog-Signature=abc"),
    key,
  );
  assert.equal(embeddedObjectPath("/objects/uploads/live-session-recordings/r-1"), "/objects/uploads/live-session-recordings/r-1");
  assert.equal(embeddedObjectPath("teacher_request_123"), null);
  assert.equal(embeddedObjectPath("https://youtu.be/abcdefghijk"), null);
  assert.equal(embeddedObjectPath("/objects/../secret"), null);
  assert.equal(isCanonicalReference(key), true);
  assert.equal(isCanonicalReference(`/api/storage${key}`), false);
  assert.equal(redactReference(`/api/storage${key}?token=secret`), `/api/storage${key}?[redacted]`);
});

function object(path: string, overrides: Partial<ObjectFacts> = {}): ObjectFacts {
  return {
    objectPath: path,
    size: 1_000_000,
    contentType: "video/mp4",
    md5: path,
    createdAt: null,
    aclOwner: "student-1",
    structure: "valid",
    ...overrides,
  };
}

function ref(value: string, key = "student-1", overrides: Partial<StoredReference> = {}): StoredReference {
  return { table: "students", column: "placement_test_video_url", keyColumn: "user_id", key, value, reportOnly: false, ...overrides };
}

test("classification never guesses ownership and only repairs exact embedded keys", () => {
  const objects = [
    object("/objects/uploads/linked"),
    object("/objects/uploads/legacy"),
    object("/objects/uploads/orphan-known", { aclOwner: "student-9" }),
    object("/objects/uploads/orphan-unknown", { aclOwner: "someone-else" }),
    object("/objects/uploads/orphan-none", { aclOwner: null }),
    object("/objects/uploads/stub", { size: 512, structure: "corrupt" }),
    object("/objects/uploads/legacy-stub", { size: 512, structure: "corrupt" }),
  ];
  const refs = [
    ref("/objects/uploads/linked"),
    ref("/api/storage/objects/uploads/legacy?token=abc", "student-2"),
    ref("/objects/uploads/stub", "student-3"),
    ref("/api/storage/objects/uploads/legacy-stub?token=abc", "student-4"),
    ref("/objects/uploads/gone", "student-5"),
  ];
  const owners = new Map([["student-9", { role: "student" }]]);
  const result = classifyVideoObjects(objects, refs, owners);
  const klass = Object.fromEntries(result.objects.map((entry) => [entry.object.objectPath, entry.klass]));
  assert.deepEqual(klass, {
    "/objects/uploads/linked": "A_LINKED_VALID",
    "/objects/uploads/legacy": "B_VALID_LEGACY_LINK",
    "/objects/uploads/orphan-known": "C_ORPHAN_OWNER_KNOWN",
    "/objects/uploads/orphan-unknown": "C_ORPHAN_OWNER_UNKNOWN",
    "/objects/uploads/orphan-none": "C_ORPHAN_NO_OWNER",
    "/objects/uploads/stub": "E_CORRUPT_LINKED",
    "/objects/uploads/legacy-stub": "E_CORRUPT_LINKED",
  });
  const repairs = result.objects.flatMap((entry) => entry.repairs);
  // Only the valid legacy link is repaired; a corrupt object is never "recovered".
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].reference.key, "student-2");
  assert.equal(repairs[0].newValue, "/objects/uploads/legacy");
  // Orphans are never attached to anyone.
  assert.equal(result.objects.filter((entry) => entry.klass.startsWith("C_")).every((entry) => entry.repairs.length === 0), true);
  assert.deepEqual(result.missing.map((entry) => entry.key), ["student-5"]);
});

test("a second pass over repaired data proposes no changes (idempotent)", () => {
  const objects = [object("/objects/uploads/legacy")];
  const first = classifyVideoObjects(objects, [ref("/api/storage/objects/uploads/legacy?token=abc")], new Map());
  assert.equal(first.objects[0].repairs.length, 1);
  const repaired = first.objects[0].repairs.map((repair) => ({ ...repair.reference, value: repair.newValue }));
  const second = classifyVideoObjects(objects, repaired, new Map());
  assert.equal(second.objects[0].klass, "A_LINKED_VALID");
  assert.equal(second.objects[0].repairs.length, 0);
});

test("jsonb references and shared objects are reported, never rewritten or merged", () => {
  const objects = [object("/objects/uploads/shared"), object("/objects/uploads/in-json")];
  const refs = [
    ref("/objects/uploads/shared", "student-1"),
    ref("/objects/uploads/shared", "student-2"),
    ref(`{"filePath":"/api/storage/objects/uploads/in-json?token=x"}`, "teacher-1", { table: "teachers", column: "kyc_answers", reportOnly: true }),
  ];
  const result = classifyVideoObjects(objects, refs, new Map());
  assert.equal(result.sharedObjects.length, 1);
  assert.equal(result.objects.flatMap((entry) => entry.repairs).length, 0);
});
