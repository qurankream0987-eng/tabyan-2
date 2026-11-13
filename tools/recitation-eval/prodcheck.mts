// Streams one clip to a running server over the live recitation socket, in real time, and
// prints what came back and how late. usage:
//   npx tsx tools/recitation-eval/prodcheck.mts <origin> <identifier> <password file> <clip.pcm 24 kHz> <surah:ayah> [adpcm|mulaw]
import { readFileSync } from "node:fs";
import WebSocket from "ws";
import { AdpcmEncoder, encodeMulaw } from "../../packages/domain/src/recitation-audio-codec";

const [origin, identifier, passwordFile, clipPath, verseKey, codec] = process.argv.slice(2);
const trpc = async (procedure: string, input: unknown, token?: string) => {
  const response = await fetch(`${origin}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ json: input }),
  });
  const body = await response.json() as { result?: { data: { json?: Record<string, unknown> } & Record<string, unknown> }; error?: unknown };
  if (!body.result) throw new Error(`${procedure}: ${JSON.stringify(body.error).slice(0, 300)}`);
  return (body.result.data.json ?? body.result.data) as Record<string, unknown>;
};

const login = await trpc("auth.studentPasswordLogin", { identifier, password: readFileSync(passwordFile, "utf8").trim() });
const token = String(login.token);
const started = await trpc("recitation.start", { mode: "general", hideMode: "visible_review", startContext: { startVerseKey: verseKey } }, token);
const sessionId = String(started.sessionId);
console.log("session started");

const pcm = readFileSync(clipPath);
const source = pcm.length >> 1;
const samples = new Float32Array(Math.round(source * 16 / 24));
for (let i = 0; i < samples.length; i += 1) {
  const position = i * 1.5;
  const left = Math.floor(position);
  const a = pcm.readInt16LE(left * 2);
  const b = pcm.readInt16LE(Math.min(source - 1, left + 1) * 2);
  samples[i] = (a + (b - a) * (position - left)) / 32768;
}

const socket = new WebSocket(`${origin.replace(/^http/, "ws")}/api/ws/recitation`);
const openedAt = Date.now();
let streamStartedAt = 0;
const lags: number[] = [];
const finals: string[] = [];
const finish = async () => {
  socket.close();
  await trpc("recitation.cancel", { sessionId }, token).catch((error) => console.log("cancel failed", String(error)));
  lags.sort((a, b) => a - b);
  console.log("heard:", finals.join(" "));
  console.log(`events ${lags.length} | first word after ${lags.length ? Math.round(firstAt) : -1} ms of audio`);
  process.exit(0);
};
let firstAt = 0;
socket.on("open", () => socket.send(JSON.stringify({ t: "auth", token, sessionId, ...(codec ? { audioCodecs: [codec] } : {}) })));
socket.on("message", (raw) => {
  const message = JSON.parse(String(raw));
  if (message.t === "ready") {
    console.log(`ready in ${Date.now() - openedAt} ms | provider ${message.provider} | rate ${message.audioSampleRateHz} | codec ${message.audioCodec ?? "pcm"}`);
    void stream(message.audioCodec);
  } else if (message.t === "transcript") {
    if (!firstAt) firstAt = Date.now() - streamStartedAt;
    lags.push(Date.now() - streamStartedAt);
    const event = message.event ?? message;
    if (event.isFinal ?? event.final) finals.push(String(event.text));
    console.log(`${String(Date.now() - streamStartedAt).padStart(6)} ms ${event.isFinal ?? event.final ? "final  " : "partial"} ${event.text}`);
  } else if (message.t === "finalized") {
    void finish();
  } else if (message.t === "error") {
    console.log("error", message.code, message.message);
    void finish();
  }
});
socket.on("close", () => console.log("socket closed"));

async function stream(agreed?: string) {
  const encoder = new AdpcmEncoder();
  const chunk = 1600; // 100 ms
  streamStartedAt = Date.now();
  for (let offset = 0; offset < samples.length; offset += chunk) {
    const part = samples.subarray(offset, Math.min(samples.length, offset + chunk));
    if (agreed === "adpcm") socket.send(encoder.encode(part));
    else if (agreed === "mulaw") socket.send(encodeMulaw(part));
    else {
      const pcm16 = Int16Array.from(part, (sample) => Math.round(Math.max(-1, Math.min(1, sample)) * 32767));
      socket.send(JSON.stringify({ t: "audio", audio: Buffer.from(pcm16.buffer).toString("base64") }));
    }
    const due = streamStartedAt + ((offset + chunk) / 16000) * 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, due - Date.now())));
  }
  console.log(`audio sent: ${(samples.length / 16000).toFixed(1)} s`);
  socket.send(JSON.stringify({ t: "commit", final: true, commitId: "end" }));
  setTimeout(() => void finish(), 8000);
}
