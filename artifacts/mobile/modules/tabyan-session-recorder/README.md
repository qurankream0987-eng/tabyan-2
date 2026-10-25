# Tabyan native session recorder

This local Expo module records the actual in-app live-session surface after the
teacher has received participant consent:

- iOS uses ReplayKit `RPScreenRecorder.startCapture`, `AVAssetWriter`, app audio,
  and microphone audio.
- Android uses MediaProjection for the rendered session surface, AudioRecord for
  microphone plus Android 10+ playback capture, AAC encoding, and a final MP4
  mux. Android versions that cannot provide both audio sources fail closed.

The module never returns a success result without a non-empty local file. It
requires a development/production build; Expo Go and web intentionally reject
the operation.