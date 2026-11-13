import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { useAuth } from "../../lib/auth";
import { ensurePageFont, loadMushafPage, loadRangeWords, loadSearchIndex } from "../../lib/mushaf/mushaf-assets";
import { NativeQuranLiveMatcher, NativeRecitationController, type NativeRecitationMatch } from "../../lib/recitation/native-recitation";
import type { NativeAudioRecorder } from "../../lib/recitation/native-recitation-controller";
import { LiveRecitationScreen } from "../../components/recitation/live-recitation-screen";
import { trpc } from "../../lib/trpc";

/**
 * Development only: replays recorded recitations whose correctness is known through the live
 * recitation session exactly as a microphone would feed it (same socket, server model and
 * matcher), and counts how often a correct reading is stopped. Opened as
 * /student/recitation-eval?source=http://10.0.2.2:8765 where `source` serves clips.json
 * ({ id, surah, ayah, label, seconds }) and pcm/<id>.pcm (24 kHz mono PCM16LE).
 */
interface Clip { id: string; surah: number; ayah: number; label: string; seconds?: number }
interface Outcome { id: string; label: string; surah: number; ayah: number; mistakes: { position: number; text: string; heard: string | null }[]; heardAnything: boolean }

const RATE = 24_000;
const TAIL_SILENCE_SECONDS = 1.2;

/** A recorder that plays one PCM clip at the pace of a microphone, then a little silence. */
function clipRecorder(samples: Float32Array, onEnded: () => void): NativeAudioRecorder {
  let callback: ((event: { buffer: { numberOfChannels: number; sampleRate: number; getChannelData(channel: number): Float32Array } }) => void) | null = null;
  let bufferLength = RATE / 10;
  let timer: ReturnType<typeof setInterval> | null = null;
  let offset = 0;
  let paused = false;
  const total = samples.length + Math.round(TAIL_SILENCE_SECONDS * RATE);
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  return {
    onAudioReady(options, onAudio) {
      // Buffers are produced at the clip's own rate; the controller resamples as it does for a microphone.
      bufferLength = Math.max(1, Math.round(options.bufferLength * RATE / options.sampleRate));
      callback = onAudio;
      return { status: "success" };
    },
    async start() {
      const startedAt = Date.now();
      timer = setInterval(() => {
        if (paused) return;
        // Keeps the microphone's pace even when a timer fires late.
        const due = Math.min(total, Math.round(((Date.now() - startedAt) / 1000) * RATE));
        while (offset + bufferLength <= due || (due === total && offset < total)) {
          const chunk = new Float32Array(bufferLength);
          if (offset < samples.length) chunk.set(samples.subarray(offset, Math.min(samples.length, offset + bufferLength)));
          offset += bufferLength;
          callback?.({ buffer: { numberOfChannels: 1, sampleRate: RATE, getChannelData: () => chunk } });
        }
        if (offset >= total) { stop(); onEnded(); }
      }, 50);
      return { status: "success" };
    },
    pause() { paused = true; },
    resume() { paused = false; },
    stop,
    clearOnAudioReady() { callback = null; },
    isRecording: () => timer !== null,
  };
}

async function loadClipSamples(source: string, id: string) {
  const response = await fetch(`${source}/pcm/${id}.pcm`);
  if (!response.ok) throw new Error(`clip ${id}: HTTP ${response.status}`);
  const pcm = new Int16Array(await response.arrayBuffer());
  const samples = new Float32Array(pcm.length);
  for (let index = 0; index < pcm.length; index += 1) samples[index] = pcm[index] / 32768;
  return samples;
}

export default function RecitationEvalScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ source?: string; from?: string; limit?: string; labels?: string }>();
  const source = (params.source ?? "http://10.0.2.2:8765").replace(/\/+$/, "");
  const clipsQuery = useQuery({
    queryKey: ["recitation-eval-clips", source],
    queryFn: async () => (await (await fetch(`${source}/clips.json`)).json()) as Clip[],
    enabled: __DEV__,
    staleTime: Infinity,
  });
  const clips = useMemo(() => {
    const labels = params.labels ? new Set(params.labels.split(",")) : null;
    const all = (clipsQuery.data ?? []).filter((clip) => !labels || labels.has(clip.label));
    const from = Number(params.from) || 0;
    return all.slice(from, from + (Number(params.limit) || all.length));
  }, [clipsQuery.data, params.from, params.limit, params.labels]);

  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<NativeRecitationMatch | null>(null);
  const [phase, setPhase] = useState<"preparing" | "listening" | "ending">("preparing");
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const startMutation = trpc.recitation.start.useMutation();
  const endMutation = trpc.recitation.end.useMutation();
  const cancelMutation = trpc.recitation.cancel.useMutation();
  const api = useRef({ start: startMutation, end: endMutation, cancel: cancelMutation });
  api.current = { start: startMutation, end: endMutation, cancel: cancelMutation };

  const clip = clips[index];
  const done = clips.length > 0 && index >= clips.length;
  const lastAyah = clip ? SURAHS[clip.surah - 1]?.ayahs ?? clip.ayah : 1;
  // The ayah and the ones after it, as when a reader starts from an ayah in the Mushaf.
  const wordsQuery = useQuery({
    queryKey: ["mushaf-range-words", clip?.surah, clip?.ayah, lastAyah],
    queryFn: () => loadRangeWords(clip!.surah, clip!.ayah, lastAyah),
    enabled: !!clip,
    staleTime: Infinity,
  });
  const words = wordsQuery.data;
  const page = (words?.[match?.readingWords ?? 0] ?? words?.[words.length - 1])?.page;
  const pageQuery = useQuery({
    queryKey: ["mushaf-page", page],
    queryFn: async () => {
      const [data] = await Promise.all([loadMushafPage(page!), ensurePageFont(page!)]);
      return data;
    },
    enabled: page !== undefined,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
  const rangeKeys = useMemo(() => new Set((words ?? []).map((word) => word.verseKey)), [words]);
  const revealedKeys = useMemo(
    () => new Set((words ?? []).slice(0, match?.readingWords ?? 0).map((word) => `${word.verseKey}:${word.position}`)),
    [words, match?.readingWords],
  );

  // One clip at a time: a real session on the server, the clip as its microphone, then the result.
  useEffect(() => {
    if (!__DEV__ || !token || !clip || !words?.length) return;
    let live = true;
    let controller: NativeRecitationController | null = null;
    let sessionId: string | null = null;
    setMatch(null);
    setPhase("preparing");
    void (async () => {
      try {
        // The whole Quran's words are known before reading, as in the app once it has opened.
        await loadSearchIndex();
        const samples = await loadClipSamples(source, clip.id);
        const matcher = new NativeQuranLiveMatcher(words);
        matcher.setStartPosition({ verseKey: `${clip.surah}:${clip.ayah}` });
        let heardAnything = false;
        let ended: () => void = () => undefined;
        const played = new Promise<void>((resolve) => { ended = resolve; });
        const session = await api.current.start.mutateAsync({ mode: "general", startContext: { startVerseKey: `${clip.surah}:${clip.ayah}` }, hideMode: "progressive_reveal" });
        sessionId = session.sessionId;
        controller = new NativeRecitationController(matcher, {
          onMatch: (next) => {
            if (next.progressionWords > 0 || next.wordFeedback.size > 0) heardAnything = true;
            if (live) setMatch(next);
          },
          onState: (state) => { if (state === "error") ended(); },
        }, {
          requestMicrophonePermission: async () => true,
          createRecorder: () => clipRecorder(samples, ended),
        });
        controller.setSoundsEnabled(false);
        await controller.start(token, session.sessionId);
        if (live) setPhase("listening");
        await played;
        if (live) setPhase("ending");
        await controller.stop();
        await api.current.end.mutateAsync({ sessionId: session.sessionId }).catch(() => undefined);
        sessionId = null;
        matcher.finish();
        const mistakes = matcher.mistakes()
          .filter((mistake) => mistake.verseKey === `${clip.surah}:${clip.ayah}`)
          .map((mistake) => ({ position: mistake.position, text: mistake.text, heard: mistake.heard }));
        const outcome: Outcome = { id: clip.id, label: clip.label, surah: clip.surah, ayah: clip.ayah, mistakes, heardAnything };
        // The run's results are read from the device log.
        console.log("RECITATION_EVAL", JSON.stringify(outcome));
        if (!live) return;
        setOutcomes((previous) => [...previous, outcome]);
        // A moment to see the result before the next clip.
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (live) setIndex((current) => current + 1);
      } catch (error) {
        if (sessionId) await api.current.cancel.mutateAsync({ sessionId }).catch(() => undefined);
        console.log("RECITATION_EVAL_ERROR", clip.id, error instanceof Error ? error.message : String(error));
        if (live) { setFailure(error instanceof Error ? error.message : String(error)); setIndex((current) => current + 1); }
      } finally {
        await controller?.dispose();
      }
    })();
    return () => { live = false; void controller?.dispose(); };
  }, [token, clip, words, source]);

  if (!__DEV__) return <Redirect href="/student/home" />;
  const correct = outcomes.filter((outcome) => outcome.label === "correct");
  const falseStops = correct.filter((outcome) => outcome.mistakes.length > 0).length;
  const wrong = outcomes.filter((outcome) => outcome.label === "in_correct");
  const caught = wrong.filter((outcome) => outcome.mistakes.length > 0).length;
  const last = outcomes[outcomes.length - 1];
  return (
    <View style={styles.root}>
      <View style={styles.hud}>
        <Text style={styles.hudTitle}>
          {done ? `انتهى الاختبار: ${outcomes.length} تسجيل` : clip ? `تسجيل ${index + 1} من ${clips.length} · ${SURAHS[clip.surah - 1]?.name} ${clip.ayah} · تقييم المراجعين: ${LABELS[clip.label] ?? clip.label}` : clipsQuery.error ? "تعذر تحميل قائمة التسجيلات" : "جارٍ التحميل…"}
        </Text>
        <Text style={styles.hudLine}>
          {`قراءة صحيحة: ${correct.length} · وقفة وهمية: ${falseStops}    |    قراءة خاطئة: ${wrong.length} · اكتُشفت: ${caught}`}
        </Text>
        {last ? (
          <Text style={[styles.hudLine, { color: last.mistakes.length ? "#FFB4A8" : "#B7E4C7" }]} numberOfLines={1}>
            {`السابق (${LABELS[last.label] ?? last.label}): ${last.mistakes.length ? `توقّف عند «${last.mistakes[0].text}»${last.mistakes[0].heard ? ` سُمعت «${last.mistakes[0].heard}»` : " (لم تُسمع)"}` : last.heardAnything ? "مرّ بلا توقف" : "لم يُسمع شيء"}`}
          </Text>
        ) : null}
        {failure ? <Text style={[styles.hudLine, { color: "#FFB4A8" }]} numberOfLines={1}>{failure}</Text> : null}
      </View>
      {!done ? (
        <LiveRecitationScreen
          phase={phase}
          match={match}
          page={pageQuery.data}
          pageError={!!pageQuery.error}
          hideMode="progressive_reveal"
          rangeKeys={rangeKeys}
          revealedKeys={revealedKeys}
          plainOutside
          errorText={null}
          onPause={() => undefined}
          onResume={() => undefined}
          onEnd={() => undefined}
          onCancel={() => undefined}
          onHint={() => undefined}
          pauseBusy={false}
          resumeBusy={false}
        />
      ) : null}
    </View>
  );
}

const LABELS: Record<string, string> = {
  correct: "صحيحة",
  in_correct: "خاطئة",
  in_complete: "ناقصة",
  multiple_aya: "أكثر من آية",
  not_match_aya: "آية أخرى",
  not_related_quran: "ليست قرآناً",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1E1414" },
  hud: { paddingTop: 44, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: "#1E1414", gap: 2 },
  hudTitle: { color: "#FFFFFF", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 21, textAlign: "right" },
  hudLine: { color: "#E8D9C5", fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "right" },
});
