import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type {
  CanonicalTranscriptEvent,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "./types";

const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const protoRoot = path.join(thisDir, "protos");
const asrProtoPath = path.join(protoRoot, "riva/proto/riva_asr.proto");

const packageDefinition = protoLoader.loadSync(asrProtoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: false,
  oneofs: true,
  includeDirs: [protoRoot],
});
const riva = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  nvidia: {
    riva: {
      asr: {
        RivaSpeechRecognition: new (target: string, credentials: grpc.ChannelCredentials) => {
          StreamingRecognize(metadata: grpc.Metadata): RivaStream;
          close(): void;
        };
      };
    };
  };
};

export const NVIDIA_NVCF_TARGET = "grpc.nvcf.nvidia.com:443";
export const NVIDIA_NEMOTRON_ASR_FUNCTION_ID = "bb0837de-8c7b-481f-9ec8-ef5663e9c1fa";
export const NVIDIA_ARABIC_SAMPLE_RATE_HZ = 16_000;

type RivaStream = grpc.ClientDuplexStream<Record<string, unknown>, {
  results?: Array<{
    isFinal?: boolean;
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
      words?: Array<{ startTime?: number; endTime?: number }>;
    }>;
  }>;
}>;

/**
 * Hosted NVIDIA NVCF adapter. The client first sends configuration and then
 * PCM16 chunks; final utterances stay within the same Tabyan session.
 */
export class NvidiaStreamingProvider implements SpeechRecognitionProvider {
  readonly name = "nvidia" as const;
  private client: { StreamingRecognize(metadata: grpc.Metadata): RivaStream; close(): void } | null = null;
  private stream: RivaStream | null = null;
  private closed = false;

  constructor(
    private readonly apiKey: string,
    private readonly events: SpeechRecognitionProviderEvents,
  ) {}

  connect() {
    if (this.stream || this.closed) return;
    const Client = riva.nvidia.riva.asr.RivaSpeechRecognition;
    this.client = new Client(NVIDIA_NVCF_TARGET, grpc.credentials.createSsl());
    const metadata = new grpc.Metadata();
    metadata.set("authorization", `Bearer ${this.apiKey}`);
    metadata.set("function-id", NVIDIA_NEMOTRON_ASR_FUNCTION_ID);
    const stream = this.client.StreamingRecognize(metadata);
    this.stream = stream;

    stream.on("data", (response: {
      results?: Array<{
        isFinal?: boolean;
        alternatives?: Array<{
          transcript?: string;
          confidence?: number;
          words?: Array<{ startTime?: number; endTime?: number }>;
        }>;
      }>;
    }) => {
      this.events.onProviderEvent();
      for (const result of response.results ?? []) {
        const alternative = result.alternatives?.[0];
        const text = alternative?.transcript?.trim();
        if (!text) continue;
        const words = alternative?.words ?? [];
        const first = words[0];
        const last = words.at(-1);
        this.events.onTranscript({
          text,
          isFinal: Boolean(result.isFinal),
          confidence: alternative?.confidence,
          startMs: first?.startTime === undefined ? undefined : Number(first.startTime),
          endMs: last?.endTime === undefined ? undefined : Number(last.endTime),
        });
      }
    });
    stream.on("error", (error: Error & { code?: number; details?: string }) => {
      if (!this.closed) {
        this.events.onError(
          error.details || error.message || "NVIDIA_STREAM_ERROR",
          error.code,
        );
      }
    });
    stream.on("end", () => {
      this.events.onClose();
    });

    stream.write({
      streamingConfig: {
        config: {
          encoding: "LINEAR_PCM",
          sampleRateHertz: NVIDIA_ARABIC_SAMPLE_RATE_HZ,
          languageCode: "ar-AR",
          maxAlternatives: 1,
          enableWordTimeOffsets: true,
        },
        interimResults: true,
      },
    });
    this.events.onReady();
  }

  appendAudio(base64Audio: string) {
    if (!this.stream || this.closed) return;
    this.stream.write({ audioContent: Buffer.from(base64Audio, "base64") });
  }

  commit() {
    // Riva streams do not use per-utterance commits. Ending this stream would
    // end recognition, so a transcript final never ends Tabyan's session.
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stream?.end();
    this.stream = null;
    this.client?.close();
    this.client = null;
  }

  isOpen() {
    return Boolean(this.stream) && !this.closed;
  }
}