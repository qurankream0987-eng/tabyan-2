import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { Platform } from "react-native";
import { apiOrigin } from "../trpc";
import { NativeRecitationCuePlayer } from "./native-recitation-cues";
import {
  NativeRecitationControllerCore,
  type NativeAudioRecorder,
  type NativeSocket,
} from "./native-recitation-controller";
import {
  NativeQuranLiveMatcher,
  type NativeRecitationCallbacks,
} from "./native-recitation-matcher";

export { confirmedWordKey, NativeQuranLiveMatcher } from "./native-recitation-matcher";
export type {
  CanonicalQuranWord,
  NativeMatcherDiagnostics,
  NativeRecitationCallbacks,
  NativeRecitationMatch,
  NativeRecitationMistake,
  NativeRecitationState,
  NativeRecitationSummary,
  NativeWordFeedback,
  NativeWordStateChange,
} from "./native-recitation-matcher";

function recitationWebSocketUrl() {
  const origin = process.env.EXPO_PUBLIC_WS_ORIGIN ?? apiOrigin();
  const websocketOrigin = origin
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:")
    .replace(/\/+$/, "");
  return `${websocketOrigin}/api/ws/recitation`;
}

export class NativeRecitationController extends NativeRecitationControllerCore {
  constructor(matcher: NativeQuranLiveMatcher, callbacks: NativeRecitationCallbacks = {}) {
    const cues = new NativeRecitationCuePlayer();
    super(matcher, callbacks, {
      isWeb: Platform.OS === "web",
      requestMicrophonePermission: async () =>
        (await AudioManager.requestRecordingPermissions()) === "Granted",
      getWebSocketUrl: recitationWebSocketUrl,
      createSocket: (url) => new WebSocket(url) as unknown as NativeSocket,
      createRecorder: () => new AudioRecorder() as unknown as NativeAudioRecorder,
      playCue: (cue) => cues.play(cue),
      disposeAudio: () => cues.dispose(),
    });
  }
}
