import { Platform } from "react-native";

/**
 * expo-camera leaves the iOS codec to AVCaptureMovieFileOutput, which records
 * HEVC on current iPhones. Supervisors review these videos on Web browsers
 * that cannot decode HEVC (Chrome/Firefox without platform HEVC support), so
 * request H.264 explicitly. Android ignores this option and records H.264.
 */
/**
 * Camera settings for reviewable recordings (placement and teacher videos): 480p at 1 Mbit/s.
 * Left unset, expo-camera records 1080p at the encoder's default bitrate (often 15–20 Mbit/s),
 * so a few minutes came to several hundred megabytes and took most of an upload on a phone.
 * The reviewer needs the reciting and the face, not detail: 480p at 1 Mbit/s is about
 * 7.5 MB a minute, so a five-minute interview stays under 40 MB.
 * On iOS the bitrate applies because `reviewableRecordingOptions` names the codec.
 */
export const reviewableCameraProps = { videoQuality: "480p", videoBitrate: 1_000_000 } as const;

export const reviewableRecordingOptions: { codec?: "avc1" } = Platform.OS === "ios"
  ? { codec: "avc1" }
  : {};
