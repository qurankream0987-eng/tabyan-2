# Tabyan — Placement Review Video Forensic Report

**Date:** 2026-09-16  
**Scope:** Native admin placement-review playback on iPhone  
**Rule followed:** inspect first; no speculative patch; no Build started.

## Executive conclusion

The investigation did not prove a single device-side root cause. The production storage objects exist, are finalized as private objects, and the server-side full and byte-range reads work. The current source also constructs a native `expo-video` `VideoSource` with an `Authorization: Bearer` header for private storage URLs and removes the query token on Native.

There is a material media difference between real production records: the newest pending sample is a valid HEVC/H.265 Main 1080×1920 MP4/MOV with `moov` at the end of the file, while older samples are H.264 Constrained Baseline files with `moov` at the beginning. This is a strong diagnostic lead, but it is **not** a proven root cause for the reported iPhone failure because the failing device record, iPhone model/iOS version, authenticated request traces, and native AVPlayer error were not available.

The requested controlled A/B preparation is complete: a separate H.264/AAC fast-start copy was created for Sample A, with a private ACL and no DB link. Both objects pass server-side full and byte-range reads. The real-device A/B result is still pending.

**No playback fix was applied. No Build was started.**

## 1. Exact failing screen

| Field | Evidence |
|---|---|
| Route | `/admin/students-review` |
| Route component | `artifacts/mobile/app/admin/students-review.tsx` |
| Workflow component | `AdminWorkflow title="مراجعة الطلاب" kind="placement"` in `artifacts/mobile/app/admin/_common.tsx` |
| Video component | `LibraryMediaPlayer` |
| Native player | `expo-video` `useVideoPlayer` + `VideoView` |
| Student recording screen | `/student/placement` records and uploads the video; it is not the review player |

The admin workflow obtains `r.videoUrl` from `admin.placementList` and passes it to `LibraryMediaPlayer` as a video.

## 2. Build/source mapping

| Field | Result |
|---|---|
| Current workspace commit | `c4a2202bc63e4bb7342121363d1b2275e503fa30` |
| Current `app.json` iOS build number | `6` |
| Build number installed on the failing iPhone | **UNKNOWN** |
| App version installed on the failing iPhone | **UNKNOWN** |
| Source commit for the installed build | **UNKNOWN** |
| Latest video fix present in installed build | **UNKNOWN** |

The source tree currently contains the requested Native source construction:

```ts
const uri = stripQueryToken(resolved);
return {
  value: { uri, headers: { Authorization: `Bearer ${token}` } },
  key: uri,
};
```

This proves only what is in the current source. It does not prove that the installed iPhone build contains this source. The only source-to-device mapping evidence available is the current config's build number; there is no device screenshot, installed-binary manifest, TestFlight/App Store build metadata, or commit mapping.

## 3. One real production placement record and object trace

Because no student identifier or device request trace was supplied, the report uses a current production sample and keeps the student and full object path redacted.

### Sample A — newest pending placement record

| Field | Result |
|---|---|
| Student ID | redacted; database fingerprint recorded during investigation only |
| DB video value | `/objects/uploads/<redacted>` |
| DB value type | relative object path |
| Object exists | **YES** |
| Object size | `61,220,623` bytes |
| Storage Content-Type | `video/mp4` |
| Object updated | `2026-09-15T18:01:18.230Z` |
| Private ACL | **YES** |
| Upload complete/finalized | **YES, strongly evidenced by the private ACL set by the finalize route** |

Production query found four pending placement records with non-null video paths. The newest one was selected for object inspection. This selection must not be mistaken for proof that it is the exact video shown in the user's failing screenshot.

### Comparison samples

| Alias | DB status/date | Size | Content-Type | Object | Media result |
|---|---:|---:|---|---|---|
| A | pending, 2026-09-15 | 61,220,623 | `video/mp4` | exists, private ACL | HEVC, `moov` at tail |
| B | pending, 2026-08-22 | 59,370,101 | `video/mp4; codecs=avc1.42000a,mp4a.40.2` | exists, private ACL | H.264, `moov` at front |
| C | rejected, 2026-08-19 | 30,584,230 | `video/mp4;codecs=avc1.42001f,mp4a.40.2` | exists, private ACL | H.264, `moov` at front |

## 4. File integrity and iOS media characteristics

### Sample A

| Field | Result |
|---|---|
| Container | ISO Base Media / QuickTime-compatible MP4 |
| Video codec | HEVC/H.265, Main profile |
| Audio codec | AAC-LC, 48 kHz, mono |
| Duration | `54.311667` seconds |
| Dimensions | `1080 × 1920` |
| `mdat` offset | `32` |
| `moov` offset | `61,183,119` |
| Fast-start `moov` at front | **NO** |
| Full-file ffprobe parse | **PASS** |
| Full-file ffmpeg decode/read | **PASS**; no corruption error was emitted |
| Truncated | **NO evidence** |
| Corrupted | **NO evidence** |
| iOS AVPlayer compatible | **UNKNOWN** |

Sample A is structurally valid, but it is not fast-start and uses HEVC. HEVC playback depends on the actual iPhone hardware/iOS capability; the device model and native error are unknown. Therefore this report does not label the file as universally iOS-compatible.

### Samples B and C

Both comparison objects parsed successfully as MP4/MOV and contain:

- H.264/AVC Constrained Baseline video;
- AAC-LC audio;
- `moov` before `mdat`;
- no evidence of truncation or file corruption.

This demonstrates that production placement objects are not homogeneous. It does not by itself prove that all old objects play on the failing iPhone.

## 4. Controlled A/B diagnostic copy

The original Sample A was kept untouched. A temporary diagnostic object was uploaded separately without changing the student's `placement_test_video_url` and without inserting or updating any database row.

| Field | Original A | Diagnostic copy |
|---|---|---|
| Object path | redacted production path | redacted temporary path |
| Container | MP4/QuickTime-compatible | MP4 |
| Video codec | HEVC/H.265 Main | H.264 Constrained Baseline |
| Audio codec | AAC-LC | AAC-LC |
| Dimensions | `1080 × 1920` | `1080 × 1920` |
| Size | `61,220,623` bytes | `21,896,423` bytes |
| `moov` position | end (`61,183,119`) | front (`36`) |
| Private ACL | yes | yes |
| DB video URL changed | no | no DB link |

### Same storage-service contract

| Request | Original A | Diagnostic copy |
|---|---:|---:|
| Full read status | `200` | `200` |
| Full bytes returned | `61,220,623` | `21,896,423` |
| `bytes=0-1023` status | `206` | `206` |
| `Content-Range` | `bytes 0-1023/61220623` | `bytes 0-1023/21896423` |
| `Accept-Ranges` | `bytes` | `bytes` |
| Range bytes returned | `1024` | `1024` |

The storage-service results do not replace an authenticated HTTP request from the iPhone. The temporary copy is diagnostic only and must not be promoted to a student's DB URL.

## 5. Exact media endpoint and Range behavior

The deployed production URL was obtained from deployment metadata: `https://tibyanquran.com` (public, successful current deployment).

### Unauthenticated HTTP probes

These probes deliberately did not use a token:

| Request | Result |
|---|---|
| `GET /api/storage/objects/uploads/<sample-A>` | `401 Unauthorized` |
| `GET ...` with `Range: bytes=0-1023` | `401 Unauthorized` |
| `HEAD ...` | `401 Unauthorized` |

This is expected for a private object and proves neither a token failure on the iPhone nor a Range bug.

### Server-side object/proxy contract test

Using the same redacted object path through the production object-storage service:

| Request | Result |
|---|---|
| Full read | `200`, exact body size `61,220,623` |
| `bytes=0-1023` | `206` |
| `Accept-Ranges` | `bytes` |
| `Content-Range` | `bytes 0-1023/61220623` |
| Range `Content-Length` | `1024` |
| Full `Content-Length` | `61220623` |
| `Content-Type` | `video/mp4` |
| `Cache-Control` | private cache policy |

The same `206` behavior was verified for Samples B and C with exact byte counts.

### Endpoint implementation review

`artifacts/api-server/src/routes/storage.ts`:

- accepts `Authorization: Bearer <token>` or `?token=`;
- rejects missing/invalid/expired tokens before object lookup;
- enforces the object ACL;
- supports single byte ranges and suffix ranges;
- returns `206`, `Accept-Ranges`, `Content-Range`, `Content-Length`, and `Content-Type`;
- returns `416` with `Content-Range: bytes */<total>` for unsatisfiable ranges;
- streams with `pipeline` and records client-abort/stream-error outcomes.

**RANGE_IMPLEMENTATION:** PASS for the tested single-range contract.  
**MULTI_RANGE_SUPPORTED:** NO; not required for normal AVPlayer playback.  
**STREAM_ABORT_HANDLING:** PASS in the implementation; a real iPhone abort trace was not observed in this investigation.  
**Authenticated HTTP Range request:** NOT TESTED because no authorized device token was available.

## 6. iOS reachability

| Field | Result |
|---|---|
| Public media host | `tibyanquran.com` |
| HTTPS deployment | public and reachable |
| Private/internal hostname in media chain | **NO evidence** |
| localhost/127.0.0.1/172.x host | **NO evidence** |
| `expo.pike.replit.dev` in media URL | **NO evidence** |
| Inaccessible redirect | **NO evidence** |
| `IOS_REACHABLE_PUBLIC_URL` | **YES at deployment level; real iPhone media request not tested** |

## 7. Authentication and Native header behavior

### Current app source

For a private storage URL on Native, `LibraryMediaPlayer`:

1. resolves a relative object path to the API origin;
2. strips `token` from the URL;
3. passes `{ uri, headers: { Authorization: "Bearer <token>" } }` to `useVideoPlayer`.

The current installed `expo-video` source in the workspace is `3.0.16` and its iOS implementation maps `VideoSource.headers` to `AVURLAssetHTTPHeaderFieldsKey`. This is implementation/source evidence, not proof of every request emitted by the installed iPhone binary.

### Required device evidence

| Field | Result |
|---|---|
| Initial request carried Authorization | **UNKNOWN** |
| Subsequent Range requests carried Authorization | **UNKNOWN** |
| Token present on device | **UNKNOWN** |
| Token expired | **UNKNOWN** |
| Token role authorized for the selected object | **UNKNOWN** |
| Media endpoint returned 401/403 for the device session | **UNKNOWN** |

No production `mediaTrace` records for an authorized iPhone playback session were available. The only deployment traces captured during this investigation were the deliberate unauthenticated `401` probes.

For the controlled A/B run, temporary safe request logging is now scoped to the two diagnostic object IDs only. It records the A/B label, method, Range, response status, whether a bearer Authorization header is present, a truncated User-Agent, and response range headers. It never records bearer tokens or account data. This instrumentation is in the local API source only; it has not been published and must be removed after the controlled test.

## 8. Actual expo-video / AVPlayer error

| Field | Result |
|---|---|
| `EXPO_VIDEO_STATUS` | **UNKNOWN** |
| `EXPO_VIDEO_ERROR` | **UNKNOWN** |
| Error code | **UNKNOWN** |
| Error domain | **UNKNOWN** |
| Native iOS error | **UNKNOWN** |
| AVPlayer item status | **UNKNOWN** |

The current component receives `playerError` on `statusChange`, but converts it immediately through `userFacingErrorMessage`. The current source does not persist or transmit the raw native error. No device console, Xcode log, TestFlight diagnostic, or authenticated server trace containing the failure was supplied.

This is the mandatory missing evidence. A message such as “تعذر تشغيل هذا الملف الإعلامي” cannot distinguish codec, URL, authorization, Range, or player configuration.

## 9. Upload finalization and DB linkage

The Native upload sequence is:

```text
recordAsync
→ request upload URL with Authorization
→ binary PUT to the signed object URL
→ await PUT success
→ POST /storage/uploads/finalize with Authorization
→ await finalize success
→ submitPlacement with the finalized object path
```

Evidence:

- `uploadNativeVideo` awaits `finalizeUpload` before returning the object path.
- `finalize` verifies the object structure using header/tail checks and ffprobe, then writes a private owner ACL.
- The selected production objects exist and have a private ACL.
- The student rows contain the same `/objects/uploads/...` object-path shape.

Therefore:

| Field | Result |
|---|---|
| `UPLOAD_FINALIZED` | **YES, inferred from the final private ACL and valid object state** |
| `DB_SAVED_AFTER_FINALIZE` | **YES by the client/API sequencing contract; no per-upload timing trace was available** |
| Object size matches downloaded object | **YES** |
| Partial upload detected | **NO evidence** |

## 10. Version and compatibility evidence

Manifest ranges in `artifacts/mobile/package.json`:

- Expo: `~54.0.20`
- expo-video: `~3.0.12`
- React Native: `0.81.5`

The lockfile and installed workspace currently resolve:

- Expo: `54.0.37`
- expo-video: `3.0.16`
- React Native: `0.81.5`

The mobile project has no committed native `ios/` directory and does not specify an explicit iOS deployment target in `app.json`; the effective native target for the device build is therefore **UNKNOWN** from this workspace alone.

The installed `expo-video` iOS source supports source headers through `AVURLAssetHTTPHeaderFieldsKey`. No package upgrade was performed, and no specific official limitation was proven from the real failing device.

**KNOWN_COMPATIBILITY_ISSUE:** UNKNOWN.  
The HEVC/tail-`moov` finding is a file/device compatibility lead, not a confirmed `expo-video` limitation.

## 11. Web versus Native

| Field | Result |
|---|---|
| Web video URL for the exact failing record | NOT TESTED |
| Native video URL for the exact failing record | NOT TESTED |
| Web auth method | Current source supports query token for web media URLs |
| Native auth method | Current source uses `Authorization` header and strips query token |
| Web playback | NOT TESTED for the exact record |
| Native playback | FAIL reported by user; not independently reproduced |

The existing architecture intentionally differs between Web and Native. A successful Web test for a different object would not prove Native playback for the failing object.

## 12. Root-cause classification

**PRIMARY_ROOT_CAUSE:** `OTHER — insufficient evidence to classify`  
**CONFIDENCE:** LOW

Evidence supporting this conservative classification:

- the installed iPhone build number and source commit are unknown;
- the exact failing production object is not identified;
- production objects differ materially in codec and `moov` placement;
- server-side full and Range reads pass;
- public reachability passes;
- the authorized initial and Range request headers are unknown;
- the token state/ACL decision for the device request is unknown;
- the real `expo-video`/AVPlayer error is unknown;
- same-device direct media access was not tested.

The most actionable lead is **Sample A's HEVC Main codec plus non-fast-start `moov` placement**, but selecting `IOS_CODEC_INCOMPATIBLE`, `RANGE_AUTH_HEADER_LOSS`, `BACKEND_MEDIA_PROXY_BUG`, or `OLD_NATIVE_BUILD` as the proven primary cause would be speculative.

## 13. Minimal fix

**MINIMUM_FIX:** None approved. Root cause is not proven.  
**FILES_REQUIRED:** None.

No production behavior, authentication policy, placement workflow, or player code was changed. The storage route has only the temporary, object-scoped A/B request logging described above; it must be removed after the device test.

## 14. Regression status

| Check | Result |
|---|---|
| Placement video playback | `REAL_DEVICE_REQUIRED` |
| Other private media | UNCHANGED |
| Teacher recordings | UNCHANGED |
| Admin certificates | UNCHANGED |
| Authentication | UNCHANGED |
| Backend routes outside media | UNCHANGED |
| Media route | Temporary A/B request logging only; response/auth behavior unchanged |
| Production data overwritten | **NO** |
| Build started | **NO** |

## 15. Controlled A/B final state

```text
ORIGINAL_IPHONE_PLAYBACK: NOT_TESTED
DIAGNOSTIC_IPHONE_PLAYBACK: NOT_TESTED
ORIGINAL_RANGE_AUTH: NOT_SEEN
DIAGNOSTIC_RANGE_AUTH: NOT_SEEN
ORIGINAL_IOS_ERROR: UNKNOWN
DIAGNOSTIC_IOS_ERROR: UNKNOWN
ROOT_CAUSE_CLASS: STILL_UNPROVEN
CONFIDENCE: LOW
PERMANENT_FIX_REQUIRED: NOT_YET
FILES_MODIFIED:
- artifacts/api-server/src/routes/storage.ts (temporary, scoped safe A/B logging)
- docs/TABYAN_PLACEMENT_VIDEO_FORENSIC_FINAL.md
PRODUCTION_DATA_OVERWRITTEN: NO
UNRELATED_FILES_MODIFIED: 0
BUILD_STARTED: NO
```

## 16. Exact evidence still required to close the investigation

The following must come from the same failing iPhone/session before a primary cause is declared:

1. installed app version, iOS build number, device model, and iOS version;
2. exact student/object path shown in that review session, redacted in the report;
3. raw `expo-video` status/error and AVPlayer error domain/code;
4. server `mediaTrace` for the same diagnostic ID or a controlled playback request;
5. proof of `Authorization` on the initial request and every relevant Range request;
6. direct authenticated playback/download on that same iPhone;
7. comparison of the same object on Web and Native;
8. one old H.264 object and one new object tested through the same iPhone pipeline.

Until those artifacts exist, the correct status is **not PASS** and not a new speculative patch.