import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedVideoUpload, videoUploadMediaType } from "./videoUploadPolicy";

test("MediaRecorder MIME types with codec parameters are accepted", () => {
  // Types stored on real production objects before the exact-match gate.
  assert.equal(isSupportedVideoUpload("placement-1.mp4", "video/mp4;codecs=avc1.42001f,mp4a.40.2"), true);
  assert.equal(isSupportedVideoUpload("placement-1.mp4", "video/mp4; codecs=avc1.42000a,mp4a.40.2"), true);
  assert.equal(isSupportedVideoUpload("placement-1.webm", "video/webm;codecs=vp9,opus"), true);
  assert.equal(isSupportedVideoUpload("teacher-intro.MP4", "Video/MP4"), true);
});

test("plain container types keep working", () => {
  assert.equal(isSupportedVideoUpload("a.mp4", "video/mp4"), true);
  assert.equal(isSupportedVideoUpload("a.webm", "video/webm"), true);
  assert.equal(isSupportedVideoUpload("IMG_0001.MOV", "video/quicktime"), true);
});

test("container and extension must still agree", () => {
  assert.equal(isSupportedVideoUpload("a.webm", "video/mp4;codecs=avc1"), false);
  assert.equal(isSupportedVideoUpload("a.mp4", "video/webm;codecs=vp8,opus"), false);
  assert.equal(isSupportedVideoUpload("a.mp4", "application/octet-stream"), false);
  assert.equal(isSupportedVideoUpload("a.mp4", ""), false);
  assert.equal(isSupportedVideoUpload("a.mp4", "video/mp4x"), false);
  assert.equal(isSupportedVideoUpload("a.mp4.exe", "video/mp4"), false);
});

test("media type essence is lower-cased and trimmed", () => {
  assert.equal(videoUploadMediaType(" Video/MP4 ; codecs=avc1"), "video/mp4");
  assert.equal(videoUploadMediaType(""), "");
});
