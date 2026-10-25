Source: https://qurani.ai/en/docs/2-advanced-tools/qrc
Title: Nabr — Real-Time Recitation Correction API | Qurani.ai
Fetched: 2026-10-10T08:29:11.700Z

Recheck note (2026-10-12): the current official QRC result schema no longer lists the `text` field shown in this older capture's `TilawaResult` type below. Treat QRC transcript/text support as UNVERIFIED until the provider resolves the documentation discrepancy; Tabyan does not forward it as transcript evidence.

Recheck note (2026-10-14): the current official guide now shows `tajweed_level` as 1–5 in both its example and payload type, while this saved capture shows 1–3. Treat the archived value as stale/conflicting and ask the provider to confirm before live use. The current guide still does not define level meanings or normative coordinate-index bases.

[Advanced tools](https://qurani.ai/en/docs/2-advanced-tools)

Open

# Nabr — Real-Time Recitation Correction API

Add AI recitation feedback with real-time tajweed correction and tilawa session streaming.

### [Description](https://qurani.ai/en/docs/2-advanced-tools/qrc\#description)

Nabr - AI Quran Recitation Corrector, is a service where users can
recite and get their recitation corrected in realtime. You will
need a subscription to get an API Key and use this feature.

The API is a WebSocket that speaks **binary MessagePack** — every
message you send or receive is encoded/decoded with
[`@msgpack/msgpack`](https://www.npmjs.com/package/@msgpack/msgpack).

The flow is:

1. **Connect** to the WebSocket with your API key.
2. **Start a session** by sending the `START_TILAWA_SESSION` method
(once per session — when the page loads, for example).
3. **Stream audio** chunks with the `CHECK_TILAWA_AUDIO` method while recording.
4. **Receive**`TILAWA_RESULT` events with correct words and mistakes in realtime.
5. **Stop** by sending the `RESET_TILAWA_SESSION` method.

### [Installation](https://qurani.ai/en/docs/2-advanced-tools/qrc\#installation)

```
npm install @msgpack/msgpack
```

Microphone audio is captured with the browser's built-in
[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
API — no extra dependency needed.

### [Usage Example](https://qurani.ai/en/docs/2-advanced-tools/qrc\#usage-example)

```
import { useEffect, useRef, useState } from "react";
import { encode, decode } from "@msgpack/msgpack";

// Methods you send to the server
const WSMethods = {
  START_TILAWA_SESSION: "START_TILAWA_SESSION",
  CHECK_TILAWA_AUDIO: "CHECK_TILAWA_AUDIO",
  RESET_TILAWA_SESSION: "RESET_TILAWA_SESSION",
} as const;

// Events you receive from the server
const WSEvents = {
  QRC_CLIENT_CONNECTED: "QRC_CLIENT_CONNECTED",
  TILAWA_SESSION_STARTED: "TILAWA_SESSION_STARTED",
  TILAWA_RESULT: "TILAWA_RESULT",
  QRC_ERROR: "QRC_ERROR",
} as const;

const WS_URL = "wss://api.qurani.ai?api_key=<YOUR_API_KEY>";

export default function QrcExample() {
  const connection = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);

  // 1. Connect and listen for messages
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.binaryType = "arraybuffer";

    socket.addEventListener("open", () => setConnected(true));
    socket.addEventListener("close", () => setConnected(false));

    socket.addEventListener("message", (event: MessageEvent<ArrayBuffer>) => {
      // Every message is MessagePack-encoded binary
      const message = decode(new Uint8Array(event.data)) as {
        event: string;
        [key: string]: unknown;
      };

      switch (message.event) {
        case WSEvents.QRC_CLIENT_CONNECTED:
          // Connection acknowledged — message.websocket_id, message.credits_balance
          break;

        case WSEvents.TILAWA_SESSION_STARTED:
          // Session is ready — message.session_id, message.exit_code
          break;

        case WSEvents.TILAWA_RESULT:
          // Realtime feedback on the recitation:
          // message.verse_index / message.word_index  -> current position
          // message.correct_words                     -> words read correctly
          // message.skipped_words                     -> words that were skipped
          // message.tajweed_mistakes                  -> tajweed errors
          // message.letter_mistakes                   -> letter pronunciation errors
          console.log("result", message);
          break;

        case WSEvents.QRC_ERROR:
          console.error(`${message.code}: ${message.message}`);
          break;
      }
    });

    connection.current = socket;
    return () => socket.close();
  }, []);

  // 2. Start the session, then stream microphone audio
  const startRecording = async () => {
    const socket = connection.current;
    if (socket?.readyState !== WebSocket.OPEN) return;

    // Start a tilawa session (send once per session)
    socket.send(
      encode({
        method: WSMethods.START_TILAWA_SESSION,
        chapter_index: 1, // surah number
        verse_index: 1,   // starting verse
        word_index: 1,    // starting word
        hafz_level: 1,    // 1-3
        tajweed_level: 1, // 1-3
      }),
    );

    // Record the microphone and send each chunk to the server
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (
        event.data.size > 0 &&
        connection.current?.readyState === WebSocket.OPEN
      ) {
        const buffer = await event.data.arrayBuffer();
        connection.current.send(
          encode({
            method: WSMethods.CHECK_TILAWA_AUDIO,
            audio: new Uint8Array(buffer),
          }),
        );
      }
    };

    recorder.onstop = () => {
      // Release the microphone
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start(250); // emit an audio chunk every 250ms

    setRecording(true);
  };

  // 3. Stop recording and reset the session on the server
  const stopRecording = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current = null;

    if (connection.current?.readyState === WebSocket.OPEN) {
      connection.current.send(
        encode({ method: WSMethods.RESET_TILAWA_SESSION }),
      );
    }

    setRecording(false);
  };

  return (
    <button
      disabled={!connected}
      onClick={recording ? stopRecording : startRecording}
    >
      {recording ? "Stop recording" : "Start recording"}
    </button>
  );
}
```

### [Types](https://qurani.ai/en/docs/2-advanced-tools/qrc\#types)

Payloads you send (always MessagePack-encoded):

```
type StartTilawaSessionPayload = {
  method: "START_TILAWA_SESSION";
  chapter_index: number;
  verse_index: number;
  word_index: number;
  hafz_level: number; // 1-3
  tajweed_level: number; // 1-3
};

type CheckTilawaAudioPayload = {
  method: "CHECK_TILAWA_AUDIO";
  audio: Uint8Array;
};

// Signals recording stopped; server flushes audio and resets the session
type ResetTilawaSessionPayload = {
  method: "RESET_TILAWA_SESSION";
};
```

Events you receive (decode each message with MessagePack):

```
type QRCClientConnected = {
  event: "QRC_CLIENT_CONNECTED";
  websocket_id: string;
  credits_balance?: number | null;
};

type TilawaSessionStarted = {
  event: "TILAWA_SESSION_STARTED";
  exit_code: number; // 6 = success
  session_id: string;
};

type QRCWord = {
  chapter: number;
  verse: number;
  word: number;
};

type Mistake = {
  chapter: number;
  verse: number;
  word: number;
  letter?: number;
  speachLike: string;
  message: string;
  errorCode?: string | null;
};

type TilawaResult = {
  event: "TILAWA_RESULT";
  exit_code: number; // 6 = success, 8 = surah finished
  chapter_index: number;
  verse_index: number;
  word_index: number;
  correct_words: QRCWord[];
  skipped_words: QRCWord[];
  tajweed_mistakes: Mistake[];
  letter_mistakes: Mistake[];
  text: string; // recognized text from ASR
};

type QRCError = {
  event: "QRC_ERROR";
  websocket_id: string;
  code: string;
  message: string;
};
```

### [Playground](https://qurani.ai/en/docs/2-advanced-tools/qrc\#playground)

Try it out in the playground below, you can also use the code above to implement it in your own project.

You need an [API key](https://qurani.ai/en/dashboard) to try this feature

Start recording

بِسۡمِٱللَّهِٱلرَّحۡمَٰنِٱلرَّحِيمِ1ٱلۡحَمۡدُلِلَّهِرَبِّٱلۡعَٰلَمِينَ2ٱلرَّحۡمَٰنِٱلرَّحِيمِ3مَٰلِكِيَوۡمِٱلدِّينِ4إِيَّاكَنَعۡبُدُوَإِيَّاكَنَسۡتَعِينُ5ٱهۡدِنَاٱلصِّرَٰطَٱلۡمُسۡتَقِيمَ6صِرَٰطَٱلَّذِينَأَنۡعَمۡتَعَلَيۡهِمۡغَيۡرِٱلۡمَغۡضُوبِعَلَيۡهِمۡوَلَاٱلضَّآلِّينَ7

[Advanced tools\\
\\
The advanced tools includes 2 services, the quran recitation corrector and the semantic search, both requires an API key to interact with them.](https://qurani.ai/en/docs/2-advanced-tools) [Playground\\
\\
Next Page](https://qurani.ai/en/docs/2-advanced-tools/semantic-search-api/playground)

### On this page

[Description](https://qurani.ai/en/docs/2-advanced-tools/qrc#description) [Installation](https://qurani.ai/en/docs/2-advanced-tools/qrc#installation) [Usage Example](https://qurani.ai/en/docs/2-advanced-tools/qrc#usage-example) [Types](https://qurani.ai/en/docs/2-advanced-tools/qrc#types) [Playground](https://qurani.ai/en/docs/2-advanced-tools/qrc#playground)