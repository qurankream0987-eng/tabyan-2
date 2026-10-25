import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

export type NativeSessionRecording = {
  uri: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: "video/mp4";
};

type NativeRecorderModule = {
  preparePlacementRecording?(): Promise<void>;
  inspectPlacementVideo?(uri: string): Promise<import("../../../lib/placement/placement-media").PlacementVideoInspection>;
  startSessionRecording(): Promise<void>;
  stopSessionRecording(): Promise<NativeSessionRecording>;
  cancelSessionRecording(): Promise<void>;
  clearSessionRecordings(): Promise<void>;
  getStatus(): "idle" | "recording" | "stopping";
};

/** iOS-only additions; old builds/Expo Go fail explicitly, never claim no audio. */
export async function prepareIOSPlacementRecording() {
  if (Platform.OS !== "ios" || !nativeModule?.preparePlacementRecording) {
    throw new Error("فحص تسجيل اختبار القبول يحتاج إلى نسخة iPhone جديدة من التطبيق.");
  }
  await nativeModule.preparePlacementRecording();
}

export async function inspectIOSPlacementVideo(uri: string) {
  if (Platform.OS !== "ios" || !nativeModule?.inspectPlacementVideo) {
    throw new Error("فحص ملف التسجيل يحتاج إلى نسخة iPhone جديدة من التطبيق.");
  }
  return nativeModule.inspectPlacementVideo(uri);
}

let nativeModule: NativeRecorderModule | null = null;
if (Platform.OS !== "web") {
  try {
    nativeModule = requireNativeModule<NativeRecorderModule>("TabyanSessionRecorder");
  } catch {
    // Expo Go and web do not include this app-specific native module.
  }
}
let cancelInFlight: Promise<void> | null = null;

function getNativeModule() {
  if (!nativeModule) {
    throw new Error("تسجيل الحلقة Native يحتاج إلى Development Build حقيقي.");
  }
  return nativeModule;
}

export function isNativeSessionRecorderAvailable() {
  return nativeModule != null;
}

export async function startSessionRecording() {
  await getNativeModule().startSessionRecording();
}

export async function stopSessionRecording() {
  return getNativeModule().stopSessionRecording();
}

export async function cancelSessionRecording() {
  if (cancelInFlight) return cancelInFlight;
  const operation = getNativeModule().cancelSessionRecording();
  cancelInFlight = operation.finally(() => { cancelInFlight = null; });
  return cancelInFlight;
}

export async function clearNativeSessionRecordings() {
  if (!nativeModule) return;
  await cancelSessionRecording();
  await nativeModule.clearSessionRecordings();
}

export function nativeSessionRecordingStatus() {
  return nativeModule?.getStatus() ?? "idle";
}