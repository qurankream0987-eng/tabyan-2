# iOS Placement audiovisual-file correction

## Status

**REAL_IPHONE_PENDING** — source changes, focused tests, TypeScript and local iOS JS/Hermes export are verified. Xcode compilation, a new TestFlight build and real-device recording/upload/playback are not performed.

## Evidence and root cause

The attachment is a screenshot, not the original recording. It proves that the old UI reported missing audio; it cannot independently prove that the file has no audio stream.

**Confirmed F — incorrect diagnostic authority:** installed `expo-video 3.0.16` implements `VideoPlayerAudioTracks.findAvailableAudioTracks` using AVAsset media-selection characteristics and audible language options. This is not `AVAsset.loadTracks(withMediaType: .audio)`. The old local preview treated an empty selection menu as proof of an absent embedded stream. Empty selection options alone do not establish absence of physical audio tracks.

**Confirmed F — container metadata mismatch:** installed `expo-camera 17.0.10` creates a `.mov` via `AVCaptureMovieFileOutput`. The original Native upload default advertised `.mp4` / `video/mp4`, without performing conversion. The new iOS caller passes metadata derived from the container bytes. The existing server already accepts `.mov` / `video/quicktime`; its APIs and proofs were not changed.

**Actual missing-audio cause on the reported iPhone remains unproven.** No original media file or device runtime logs were supplied. Do not classify A/B/C/D/E as established root causes:

- A: camera and microphone are already requested separately and in order.
- B: the camera is already video-mode with `mute={false}`; the installed native camera code adds an audio input in that configuration.
- C: no device evidence of a wrong audio session. An explicit authorized, recording-capable `.playAndRecord` / `.videoRecording` preflight is now added defensively.
- D: the client has no transcoding, compression, format conversion or audio merge in this path.
- E: actual audible playback is not device-tested. The iOS placement player is now explicitly unmuted at volume 1 with `doNotMix`; its playback session uses `.playback` / `.moviePlayback` in installed expo-video.

## Exact path and files

1. `artifacts/mobile/app/student/placement.tsx`
   - `requestRecordingPermissions`: separate camera/microphone hooks; no grant inference.
   - `record`: camera ready → countdown → current native authorization/audio-session preflight → `CameraView.recordAsync({maxDuration: 300, codec: "avc1"})` on iOS.
   - `CameraView`: front camera, `mode="video"`, `mute={false}`.
   - STOP / automatic completion → `FINALIZING` → `VALIDATING`.
   - The returned camera URI is tracked as a private temporary file; there is no copy or conversion.
   - Preserve existing attempt reservation for valid-length finalized recordings, including recordings later rejected by inspection. No change to five attempts, account/path ownership, or backend consumption rules.
   - iOS inspection succeeds only with image/audio tracks, a nonempty file and eligible duration. Only then mount preview and enter `PREVIEW`.
   - `uploadAndSubmit`: fail-closed guard, reinspection of the exact upload URI, matching container/name/MIME → existing uploader → unchanged submission/proof.
2. `artifacts/mobile/lib/native-recording.ts`: iOS H.264 `avc1` codec request; unchanged.
3. `artifacts/mobile/modules/tabyan-session-recorder/src/index.ts`: iOS-only wrappers. Missing methods on older builds/Expo Go fail explicitly; they never become a missing-audio diagnosis.
4. `artifacts/mobile/modules/tabyan-session-recorder/ios/TabyanSessionRecorderModule.swift`
   - `preparePlacementRecording`: independently checks current AVCapture camera and audio authorization, then activates the recording-capable session.
   - `inspectPlacementVideo`: AVURLAsset physical video/audio tracks, duration, file size, format-description codecs, and ftyp container brand. Inspection errors are not mapped to zero audio tracks.
   - Existing ReplayKit session recording logic is unchanged.
5. `artifacts/mobile/modules/tabyan-session-recorder/ios/TabyanSessionRecorder.podspec`: registers the existing local module's Swift sources with ExpoModulesCore/AVFoundation/ReplayKit. Apple autolinking resolves this source pod.
6. `artifacts/mobile/components/library-media-player.tsx`: `LocalVideoPreview` explicitly unmutes iOS placement previews and reports muted-player state separately. Placement no longer uses its language-selection callbacks as file evidence. Web/Android playback configuration is unchanged.
7. `artifacts/mobile/lib/mobile-upload.ts`: existing `uploadNativeVideo` / `uploadNativeFileWithResult` sends the exact local file through BINARY_CONTENT PUT, then existing request/finalize/proof. No source changes.
8. `artifacts/mobile/app.json`: Info.plist purpose strings and camera plugin already contain NSCameraUsageDescription / NSMicrophoneUsageDescription. Local Expo introspection confirms both. No configuration-string change required.

## Diagnosis and fail-closed behavior

- Microphone authorization denied: “لم يتم السماح باستخدام الميكروفون.”
- Recorder/audio-session start failure: “تعذر بدء تسجيل الصوت.”
- Inspected zero audio streams: “لم يتم حفظ الصوت داخل ملف الفيديو.”
- Inspection unsupported/failed: separate verification error; never assert absence.
- Muted preview player: “الصوت مكتوم في المعاينة.”
- Pending, unknown, stale-URI, missing-audio or otherwise invalid media cannot pass the handler guard or enable Send.
- Invalid recordings retain the measured stream counts locally for diagnosis. Retry/delete remains subject to existing attempt rules; no extra attempts are silently granted.

## Local verification

| Check | Result |
|---|---|
| Camera permission source + generated config | PASS (device authorization not tested) |
| Separate microphone permission source + generated config | PASS (device authorization not tested) |
| Recorder audio enabled | PASS, source (`mute=false`, native audio-input path) |
| iOS recording-capable session preflight | PASS, source; device activation pending |
| Original recording audio track | NOT_REAL_DEVICE_TESTED |
| Client post-processing preserves original URI/bytes | PASS, source; no processing exists |
| Preview unmuted / playback session | PASS, source; audible device proof pending |
| Invalid no-audio file blocked | PASS, pure guard/state tests; device pending |
| Focused tests | PASS: 24 cases, recording lifecycle + file authority |
| TypeScript | PASS |
| Native iOS JS/Hermes export | PASS |
| Apple native-module autolinking | PASS, pod resolves to local source |
| Xcode/Swift native compilation | NOT_RUN (no Apple toolchain here) |
| Real iPhone retest | PENDING |
| Database / backend upload API / proofs / roles / AI changed | NO |
| Main Web changed | NO |
| Deployment / TestFlight build | NO |

Commands: `pnpm --filter @workspace/mobile run typecheck`; installed shared Vitest runner with Mobile root and the two placement test files; `expo export --platform ios --output-dir /tmp/tabyan-ios-placement-export --max-workers 2`; Apple autolinking resolve; local Expo config introspection.

## Required real-iPhone acceptance (not executed)

On a newly compiled build, test separate permission denial and both granted; record at least 45 seconds of spoken recitation; STOP and automatic finalization; ensure inspection reports real video/audio tracks and actual container/codecs; listen to the Native preview including hardware silent mode; upload the same recording; verify stored file streams and audible supervisor playback through existing permissions. Test an actually audio-less fixture and inspection failure: no preview approval or submission; retry follows the current attempts policy. Preserve the original recording as the evidence for any remaining defect.

No intentionally initiated paid build, external paid API, GPU, deployment or new service. Only focused local checks and the requested local export were used. Actual Replit billing is not asserted.
