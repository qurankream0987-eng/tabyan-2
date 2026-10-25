import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizePlacementPlaybackContentType,
  normalizeServedMediaContentType,
  parsePlacementPlaybackRange,
} from "./placementPlaybackHttp";

test("placement Range parser supports Safari probes, open, seek, and suffix ranges", () => {
  assert.deepEqual(parsePlacementPlaybackRange("bytes=0-1", 100), {
    range: { start: 0, end: 1, total: 100 },
    invalid: false,
  });
  assert.deepEqual(parsePlacementPlaybackRange("bytes=0-", 100), {
    range: { start: 0, end: 99, total: 100 },
    invalid: false,
  });
  assert.deepEqual(parsePlacementPlaybackRange("bytes=40-59", 100), {
    range: { start: 40, end: 59, total: 100 },
    invalid: false,
  });
  assert.deepEqual(parsePlacementPlaybackRange("bytes=-10", 100), {
    range: { start: 90, end: 99, total: 100 },
    invalid: false,
  });
});

test("placement Range parser rejects unsatisfiable ranges and ignores malformed headers", () => {
  assert.deepEqual(parsePlacementPlaybackRange("bytes=100-", 100), { invalid: true });
  assert.deepEqual(parsePlacementPlaybackRange("bytes=20-10", 100), { invalid: true });
  assert.deepEqual(parsePlacementPlaybackRange("bytes=-0", 100), { invalid: true });
  assert.deepEqual(parsePlacementPlaybackRange("items=0-1", 100), { invalid: false });
  assert.deepEqual(parsePlacementPlaybackRange(undefined, 100), { invalid: false });
});

test("placement MIME normalization strips codec parameters and preserves supported containers", () => {
  assert.deepEqual(normalizePlacementPlaybackContentType("video/mp4"), {
    contentType: "video/mp4",
    diagnosticCode: null,
  });
  assert.deepEqual(normalizePlacementPlaybackContentType("Video/MP4; codecs=avc1.42E01E,mp4a.40.2"), {
    contentType: "video/mp4",
    diagnosticCode: "PV18D2",
  });
  assert.deepEqual(normalizePlacementPlaybackContentType(" video/webm; codecs=vp9 "), {
    contentType: "video/webm",
    diagnosticCode: "PV18D2",
  });
  assert.deepEqual(normalizePlacementPlaybackContentType("video/quicktime"), {
    contentType: "video/quicktime",
    diagnosticCode: null,
  });
  assert.deepEqual(normalizePlacementPlaybackContentType("text/plain"), {
    contentType: "application/octet-stream",
    diagnosticCode: null,
  });
});
test("general media MIME normalization strips codec parameters but leaves documents untouched", () => {
  assert.equal(normalizeServedMediaContentType("video/mp4; codecs=avc1.42000a,mp4a.40.2"), "video/mp4");
  assert.equal(normalizeServedMediaContentType("video/mp4;codecs=vp9,opus"), "video/mp4");
  assert.equal(normalizeServedMediaContentType("Audio/WebM;codecs=opus"), "audio/webm");
  assert.equal(normalizeServedMediaContentType("application/pdf"), "application/pdf");
  assert.equal(normalizeServedMediaContentType(""), "application/octet-stream");
  assert.equal(normalizeServedMediaContentType(undefined), "application/octet-stream");
});
