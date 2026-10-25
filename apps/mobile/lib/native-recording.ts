import { Platform } from "react-native";

/**
 * expo-camera leaves the iOS codec to AVCaptureMovieFileOutput, which records
 * HEVC on current iPhones. Supervisors review these videos on Web browsers
 * that cannot decode HEVC (Chrome/Firefox without platform HEVC support), so
 * request H.264 explicitly. Android ignores this option and records H.264.
 */
export const reviewableRecordingOptions: { codec?: "avc1" } = Platform.OS === "ios"
  ? { codec: "avc1" }
  : {};
