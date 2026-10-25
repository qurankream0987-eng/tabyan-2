# iOS Placement Preview — Final Strict Fix

**Status:** Implemented; `REAL_IPHONE_PENDING`

## Scope

This change applies only to the Native iOS Placement preview. The Web flow, backend contracts, database, upload-proof checks, supervisor playback, signed-media access, Quran AI, and attempt-consumption rules were not changed. No deployment was performed.

## Preview state and validation

The iOS screen now derives one preview view model from the current flow phase, finalized local URI, final-file inspection result, duration bounds, and the attempt values supplied by `placementStatus`. It distinguishes:

- `READY`, `COUNTDOWN`, `STARTING`, `RECORDING`, `FINALIZING`, and `VALIDATING`
- `PREVIEW_VALID`
- `PREVIEW_INVALID_VIDEO`, `PREVIEW_INVALID_AUDIO`, `PREVIEW_INVALID_DURATION`, and `PREVIEW_INVALID_FILE`
- `UPLOADING` and `SUCCESS`

The preview/send gate is derived from the inspected finalized file:

`submissionReady = videoValid && audioValid && durationValid && fileReadable`

The same validation helper drives the preview status and the pre-upload reinspection. Microphone permission is not treated as proof that audio exists in the saved video. A readable video with no audio remains visible for review, but it cannot be sent.

The missing-audio message is concise and actionable: “لم يتم حفظ الصوت داخل التسجيل.” / “تحقق من إذن الميكروفون وأعد التسجيل.” Invalid media never presents a send action as ready; it offers re-recording instead. If the authoritative attempt limit has been reached, re-recording remains disabled and the screen explains why.

## Layout and reset behavior

- iOS uses a dedicated preview presentation, separate from ready/recording guidance; no pre-record instruction card is rendered in this state.
- The video is centered in the available content width, constrained to a portrait 3:4 frame, and uses `contain` so it is not cropped. It remains visible for invalid-audio previews when the image track is valid.
- The play control is centered within the video, reduced to 58 px, and only appears while paused or after playback ends. No full-frame pause layer or validation text overlays the video.
- The validation summary, duration, authoritative attempts-used/maximum count, and actions sit below the video. Existing light/dark theme colors are used.
- Re-recording clears the draft URI and inspected-media reference, duration/timer flags, upload/error state, reserved-attempt reference, and the prior Tuhfa answer. Existing attempt consumption is preserved; recording again still requires an available server-authorized attempt.

## Attempt limit and upload safety

On iOS, the client now reads `maxAttempts` from the existing `placementStatus` response instead of using a fixed preview limit. Non-iOS display behavior remains on its existing limit. The server still consumes an attempt at the same point as before, and the finalized file is re-inspected before upload. Upload metadata, video proof, and server attachment flow are unchanged.

## Verification

- Mobile TypeScript check: `pnpm --filter @workspace/mobile run typecheck` — passed.
- Focused Vitest suites: `placement-media.test.ts`, `placement-preview-ui.test.ts`, and `placement-recording.test.ts` — 32 tests passed.
- `git diff --check` — passed.
- Expo workflow was running and bundled the app. The available browser capture showed the startup splash, not an authenticated Placement screen. Its `useNativeDriver` warning is unrelated to this preview change.

## Device evidence

`REAL_IPHONE_PENDING` — no authenticated physical iPhone/TestFlight session was available. The browser screenshot and automated tests do not establish device-level visual PASS. Confirm the valid preview and invalid-audio preview on a real iPhone before marking the visual requirement PASS.
