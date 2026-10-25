# Source capture: market-nabr-qrc-docs

URL: https://qurani.ai/en/docs/2-advanced-tools/qrc
Fetched: 2026-10-15

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
4. **Receive**`TILAWA_RESULT` events with correct words and mistakes in realtime. The server also sends `KEEP_ALIVE` about every 15 seconds.
5. **Stop** by sending the `RESET_TILAWA_SESSION` method.

### [Installation](https://qurani.ai/en/docs/2-advanced-tools/qrc\#installation)

```
npm install @msgpack/msgpack
```

Microphone audio is captured with the browser's built-in
[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
API — no extra dependency needed.
WAV chunks need no extra package. Opus packets need an Opus encoder.

### [Audio](https://qurani.ai/en/docs/2-advanced-tools/qrc\#audio)

Audio is **16 kHz, mono**. Set `audio_format` on the WebSocket URL. Each `CHECK_TILAWA_AUDIO` message is decoded on its own — do not split one file across messages, and do not send a WebM or Ogg container.

The first result is returned after about **3 seconds** of speech. Later results follow about every **500 ms** of new audio. Send at roughly playback speed. The server keeps about one second of 20 ms Opus packets in its decode queue and drops older packets when that queue is full.

#### [Opus](https://qurani.ai/en/docs/2-advanced-tools/qrc\#opus)

`audio_format=opus` (the server default).

Each `audio` value is **one raw Opus packet**:

|  |  |
| --- | --- |
| Frame | 20 ms |
| Samples | 320 (16 000 × 0.020) |
| Channels | 1 |
| PCM before encode | signed 16-bit little-endian |
| Messages | one packet each, about 50 per second |

```
const OPUS_FRAME_SAMPLES = 320; // 20 ms at 16 kHz

// `frame` is exactly 320 s16le samples. `packet` is the Opus packet bytes,
// not a WebM or Ogg blob.
const packet: Uint8Array = encoder.encode(frame);
socket.send(
  encode({
    method: "CHECK_TILAWA_AUDIO",
    audio: packet,
    client_sent_at_ms: Date.now(),
  }),
);
```

#### [WAV](https://qurani.ai/en/docs/2-advanced-tools/qrc\#wav)

`audio_format=wav`.

Each `audio` value is a **complete WAV file** (RIFF header plus PCM), 16 kHz, mono, 16-bit. A 200 ms chunk is 3 200 samples (6 400 bytes of PCM, plus the 44-byte header). Shorter or longer files are fine as long as each message is a whole WAV.

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
  TILAWA_SESSION_ENDED: "TILAWA_SESSION_ENDED",
  TILAWA_RESULT: "TILAWA_RESULT",
  KEEP_ALIVE: "KEEP_ALIVE",
  QRC_ERROR: "QRC_ERROR",
} as const;

const SAMPLE_RATE = 16000;
const WAV_CHUNK_SAMPLES = 3200; // 200 ms

const WS_URL =
  "wss://api.qurani.ai?api_key=<YOUR_API_KEY>&lang=ar&audio_format=wav";

function pcmToWav(samples: Int16Array): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataBytes, true);
  new Int16Array(buffer, 44).set(samples);
  return new Uint8Array(buffer);
}

export default function QrcExample() {
  const connection = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const micStream = useRef<MediaStream | null>(null);

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

        case WSEvents.TILAWA_SESSION_ENDED:
          // Session ended (reset or surah finished) — message.session_id, message.asr_call_count
          break;

        case WSEvents.KEEP_ALIVE:
          // Server heartbeat every ~15s — message.timestamp, message.websocket_id
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
        tajweed_level: 1, // 1-5
      }),
    );

    // Capture 16 kHz mono PCM and send a complete 200 ms WAV every chunk.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: SAMPLE_RATE },
    });
    micStream.current = stream;
    const context = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContext.current = context;
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const pending: number[] = [];

    processor.onaudioprocess = (event) => {
      if (connection.current?.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        pending.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      }
      while (pending.length >= WAV_CHUNK_SAMPLES) {
        const frame = Int16Array.from(pending.splice(0, WAV_CHUNK_SAMPLES));
        connection.current.send(
          encode({
            method: WSMethods.CHECK_TILAWA_AUDIO,
            audio: pcmToWav(frame),
            client_sent_at_ms: Date.now(),
          }),
        );
      }
    };

    const mute = context.createGain();
    mute.gain.value = 0;
    source.connect(processor);
    processor.connect(mute);
    mute.connect(context.destination);

    setRecording(true);
  };

  // 3. Stop recording and reset the session on the server
  const stopRecording = () => {
    audioContext.current?.close();
    audioContext.current = null;
    micStream.current?.getTracks().forEach((track) => track.stop());
    micStream.current = null;

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
  tajweed_level: number; // 1-5
};

type CheckTilawaAudioPayload = {
  method: "CHECK_TILAWA_AUDIO";
  // Opus: one 20 ms raw packet (320 samples at 16 kHz, mono).
  // WAV: one complete 16 kHz mono 16-bit WAV file.
  audio: Uint8Array;
  client_sent_at_ms?: number;
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

type TilawaSessionEnded = {
  event: "TILAWA_SESSION_ENDED";
  session_id: string;
  asr_call_count: number;
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
  letter?: number; // letter mistakes only
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
};

type KeepAlive = {
  event: "KEEP_ALIVE";
  websocket_id: string;
  timestamp: number; // unix seconds
  client_sent_at_ms?: number | null;
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

[Description](https://qurani.ai/en/docs/2-advanced-tools/qrc#description) [Installation](https://qurani.ai/en/docs/2-advanced-tools/qrc#installation) [Audio](https://qurani.ai/en/docs/2-advanced-tools/qrc#audio) [Opus](https://qurani.ai/en/docs/2-advanced-tools/qrc#opus) [WAV](https://qurani.ai/en/docs/2-advanced-tools/qrc#wav) [Usage Example](https://qurani.ai/en/docs/2-advanced-tools/qrc#usage-example) [Types](https://qurani.ai/en/docs/2-advanced-tools/qrc#types) [Playground](https://qurani.ai/en/docs/2-advanced-tools/qrc#playground)