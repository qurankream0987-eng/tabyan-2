/**
 * @license
 * Tabyan Smart Mushaf — application shell
 *
 * The authentic 604-page Madani Mushaf (QCF v2) with live recitation
 * following. React state here changes on navigation, mode and modal changes
 * only; recitation progress flows from the live controller through the
 * per-word presentation store straight to the affected glyphs.
 */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import { defaultQuranProvider } from './quran/providers/TanzilQuranProvider';
import { SURAH_METADATA } from './quran/data/surahMetadata';
import { JUZ_REFERENCES, getJuzForAyah } from './quran/data/pages';
import { getCanonicalWordIndex } from './quran/canonical/CanonicalWordIndex';
import { firstWordOfPage, pageOfWord } from './quran/layout/pageWordIndex';
import type { Bookmark, WordKey } from './quran/domain/types';
import type { MushafMode, SessionResultSummary } from './smart/state/types';
import { WordPresentationStore } from './live/store/WordPresentationStore';
import { VisualLatencyMeter } from './live/metrics/VisualLatencyMeter';
import { LiveRecitationController, type ControllerSnapshot } from './live/LiveRecitationController';
import { MicrophonePipeline, WebMicSource, prewarmMicrophone, releaseMicrophone } from './live/audio/MicrophonePipeline';
import { isSessionActive } from './live/session/sessionMachine';
import {
  createLiveProvider,
  defaultLiveProviderKind,
  preloadLiveProvider,
  type LiveProviderKind,
} from './live/providers/createLiveProvider';
import type { FakeStreamScenario } from './live/providers/FakeStreamProvider';
import { MushafLiveContext, type MushafLiveContextValue } from './mushaf/qcf/MushafLiveContext';
import { QcfResourcesContext, browserQcfResources, type QcfResources } from './mushaf/qcf/qcfResources';
import { QcfMushafView, type QcfMushafViewHandle } from './mushaf/qcf/QcfMushafView';
import {
  loadLastPage,
  loadReaderPreferences,
  saveLastPage,
  saveReaderPreferences,
  type ReaderPreferences,
} from './reader/readerPreferences';
import { MushafNavBar } from './mushaf/navigation/MushafNavBar';
import { NavigationModal } from './mushaf/navigation/NavigationModal';
import { ReadingControls } from './features/reading/ReadingControls';
import { SearchModal } from './features/reading/SearchModal';
import { BookmarksModal } from './features/reading/BookmarksModal';
import { SettingsModal } from './features/reading/SettingsModal';
import { defaultAudioPlayback } from './features/reading/AudioPlaybackService';
import { SessionSummaryModal } from './features/tasmee/SessionSummaryModal';
import { TeacherModeShell } from './features/teacher/TeacherModeShell';
import { LiveRecitationDock } from './features/live/LiveRecitationDock';

const LiveDiagnosticsPanel = import.meta.env.DEV ? lazy(() => import('./diagnostics/LiveDiagnosticsPanel')) : null;

/** Test and development seams. Production uses none of them. */
export interface SmartMushafAppOptions {
  readonly initialPage?: number;
  readonly initialMode?: MushafMode;
  readonly providerKind?: LiveProviderKind;
  readonly fakeScenario?: FakeStreamScenario;
  readonly fakeScenarioName?: string;
  readonly useMicrophone?: boolean;
  readonly autoStart?: boolean;
  readonly resources?: QcfResources;
  readonly onGlyphRender?: (ordinal: number) => void;
}

interface DevParams {
  readonly provider?: LiveProviderKind;
  readonly scenario?: string;
  readonly page?: number;
  readonly mode?: MushafMode;
  readonly mic?: boolean;
  readonly autostart?: boolean;
}

/** Development-only URL switches used by the browser performance harness. */
function readDevParams(): DevParams {
  if (!import.meta.env.DEV || typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('smPage'));
  const mode = params.get('smMode');
  const provider = params.get('smProvider');
  return {
    provider: provider === 'fake-stream' || provider === 'nabr' ? provider : undefined,
    scenario: params.get('smScenario') ?? undefined,
    page: Number.isInteger(page) && page >= 1 && page <= 604 ? page : undefined,
    mode: mode === 'TASMEE' || mode === 'CORRECTION' || mode === 'READING' || mode === 'TEACHER' ? mode : undefined,
    mic: params.has('smMic') ? params.get('smMic') !== '0' : undefined,
    autostart: params.get('smAutostart') === '1',
  };
}

function useMeasuredHeight(ref: RefObject<HTMLElement | null>, deps: readonly unknown[]): number {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current?.firstElementChild as HTMLElement | null | undefined;
    if (!element) {
      setHeight(0);
      return;
    }
    const measure = () => setHeight(element.getBoundingClientRect().height);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
    // The measured element changes with the mode-specific bar.
  }, deps);
  return height;
}

function useControllerValue<T>(controller: LiveRecitationController, select: (snapshot: ControllerSnapshot) => T): T {
  return useSyncExternalStore(controller.subscribe, () => select(controller.getSnapshot()));
}

const selectActive = (snapshot: ControllerSnapshot) => isSessionActive(snapshot.session.phase);

export default function App({ options = {} }: { readonly options?: SmartMushafAppOptions } = {}) {
  const devParams = useMemo(readDevParams, []);
  const index = getCanonicalWordIndex();

  const providerKindRef = useRef<LiveProviderKind>(options.providerKind ?? devParams.provider ?? defaultLiveProviderKind());
  const [providerKind, setProviderKind] = useState(providerKindRef.current);
  const [scenarioName, setScenarioName] = useState(options.fakeScenarioName ?? devParams.scenario ?? 'continuous120');
  const scenarioRef = useRef<FakeStreamScenario | undefined>(options.fakeScenario);

  const [engine] = useState(() => {
    const store = new WordPresentationStore(index.totalWords);
    const meter = new VisualLatencyMeter();
    const controller: LiveRecitationController = new LiveRecitationController({
      index,
      store,
      meter,
      createProvider: () =>
        createLiveProvider(providerKindRef.current, index, {
          resumeAnchor: () => controller.nextExpectedWord(),
          fakeScenario: scenarioRef.current,
        }),
      createMicrophone: (events) => new MicrophonePipeline(new WebMicSource(), events),
    });
    return { store, meter, controller };
  });
  const { store, meter, controller } = engine;

  const live = useMemo<MushafLiveContextValue>(
    () => ({ index, store, meter, onGlyphRender: options.onGlyphRender }),
    [index, store, meter, options.onGlyphRender],
  );

  // ── Provider selection (dev builds can switch; production is always Nabr) ──
  useEffect(() => {
    providerKindRef.current = providerKind;
    // The DEV guard must wrap the dynamic import itself so production builds drop the chunk.
    if (import.meta.env.DEV && providerKind === 'fake-stream') {
      void preloadLiveProvider('fake-stream').then(async () => {
        if (options.fakeScenario) return;
        const { FAKE_STREAM_SCENARIOS } = await import('./live/providers/FakeStreamProvider');
        scenarioRef.current = FAKE_STREAM_SCENARIOS[scenarioName as keyof typeof FAKE_STREAM_SCENARIOS]
          ?? FAKE_STREAM_SCENARIOS.continuous120;
      });
    }
  }, [providerKind, scenarioName, options.fakeScenario]);

  // ── Reader state ───────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<ReaderPreferences>(loadReaderPreferences);
  const [mode, setMode] = useState<MushafMode>(options.initialMode ?? devParams.mode ?? 'READING');
  const initialPage = useRef(options.initialPage ?? devParams.page ?? loadLastPage()).current;
  const [visiblePage, setVisiblePage] = useState(initialPage);
  const [selectedKey, setSelectedKey] = useState<WordKey | null>(null);
  const [followAway, setFollowAway] = useState(false);
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [summary, setSummary] = useState<SessionResultSummary | null>(null);
  const [bookmarks, setBookmarks] = useState<readonly Bookmark[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const viewRef = useRef<QcfMushafViewHandle>(null);
  const sessionStartedAt = useRef<number | null>(null);
  const sessionActive = useControllerValue(controller, selectActive);
  const sessionActiveRef = useRef(sessionActive);
  sessionActiveRef.current = sessionActive;

  const pageStart = firstWordOfPage(visiblePage) ?? { surah: 1, ayah: 1, wordIndex: 1 };
  const focusKey = selectedKey ?? pageStart;
  const surahMeta = SURAH_METADATA[focusKey.surah - 1];
  const juzNumber = getJuzForAyah(focusKey.surah, focusKey.ayah);

  const navRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topInset = useMeasuredHeight(navRef, []);
  const bottomInset = useMeasuredHeight(bottomRef, [mode]);

  // ── Theme ──────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.darkMode);
    document.body.className = preferences.darkMode
      ? 'bg-[#170F11] text-[#EAD8C7] antialiased'
      : 'bg-[#F5EFE2] text-[#2C1E22] antialiased';
  }, [preferences.darkMode]);

  const updatePreferences = useCallback((update: Partial<ReaderPreferences>) => {
    setPreferences((previous) => {
      const next = { ...previous, ...update };
      saveReaderPreferences(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = defaultAudioPlayback.onStateChange((state) => setIsAudioPlaying(state.isPlaying));
    return () => {
      unsubscribe();
      defaultAudioPlayback.stop();
      void controller.stop();
      releaseMicrophone();
    };
  }, [controller]);

  // Dev builds expose the engine to the browser performance harness.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as typeof window & { __smartMushafLive?: unknown }).__smartMushafLive = { controller, meter, store, index, viewRef };
  }, [controller, meter, store, index]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const onVisiblePageChange = useCallback((page: number) => {
    setVisiblePage(page);
    saveLastPage(page);
  }, []);

  const goToPage = useCallback((page: number) => {
    defaultAudioPlayback.stop();
    viewRef.current?.scrollToPage(page);
  }, []);

  const goToWord = useCallback((key: WordKey) => {
    setSelectedKey(key);
    viewRef.current?.scrollToWord(key, 'auto');
  }, []);

  const handleSelectSurah = useCallback((surah: number) => {
    setSelectedKey(null);
    goToPage(pageOfWord({ surah, ayah: 1, wordIndex: 1 }, index));
  }, [goToPage, index]);

  const handleSelectJuz = useCallback((juz: number) => {
    const reference = JUZ_REFERENCES.find((entry) => entry.juzNumber === juz);
    if (!reference) return;
    setSelectedKey(null);
    goToPage(pageOfWord({ surah: reference.startSurah, ayah: reference.startAyah, wordIndex: 1 }, index));
  }, [goToPage, index]);

  // ── Live session ───────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    const anchor = selectedKey ?? firstWordOfPage(viewRef.current?.getVisiblePage() ?? visiblePage) ?? pageStart;
    const last = index.keyAt(index.totalWords - 1)!;
    setSummary(null);
    sessionStartedAt.current = Date.now();
    defaultAudioPlayback.stop();
    viewRef.current?.resumeFollow();
    void controller.start({
      anchor,
      scope: { from: anchor, to: last },
      startMode: 'anchor',
      useMicrophone: options.useMicrophone ?? devParams.mic ?? true,
    });
  }, [controller, selectedKey, visiblePage, pageStart, index, options.useMicrophone, devParams.mic]);

  const stopSession = useCallback(async (showSummary: boolean) => {
    const snapshot = controller.getSnapshot();
    const startedAt = sessionStartedAt.current;
    await controller.stop();
    sessionStartedAt.current = null;
    setSelectedKey(null);
    if (!showSummary || startedAt === null) return;
    const judged = snapshot.recited + snapshot.skipped + snapshot.revealed;
    const ayah = snapshot.currentAyah ?? { surah: pageStart.surah, ayah: pageStart.ayah };
    setSummary({
      sessionId: snapshot.session.sessionId ?? `session-${startedAt}`,
      mode,
      startedAt,
      endedAt: Date.now(),
      targetScope: { surahNumber: ayah.surah, startAyah: 1, endAyah: ayah.ayah },
      metrics: {
        totalWordsInScope: judged,
        confirmedWordsCount: snapshot.recited,
        skippedWordsCount: snapshot.skipped,
        repeatedWordsCount: 0,
        revealedWordsCount: snapshot.revealed,
        mistakeCount: 0,
        accuracyPercentage: judged > 0 ? Math.round((snapshot.recited / judged) * 100) : 100,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
      mistakes: [],
    });
  }, [controller, mode, pageStart]);

  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !(options.autoStart || devParams.autostart)) return;
    autoStarted.current = true;
    const start = () => startSession();
    if (providerKindRef.current === 'fake-stream') void preloadLiveProvider('fake-stream').then(() => setTimeout(start, 50));
    else start();
  }, [options.autoStart, devParams.autostart, startSession]);

  const handleSelectMode = useCallback((next: MushafMode) => {
    if (next === mode) return;
    if (sessionActiveRef.current) void stopSession(false);
    setMode(next);
  }, [mode, stopSession]);

  const onWordActivate = useCallback((ordinal: number) => {
    const key = index.keyAt(ordinal);
    if (!key) return;
    if (sessionActiveRef.current) {
      // "Start from here": an explicit, legitimate jump.
      controller.relocate(key);
      return;
    }
    setSelectedKey(key);
    store.reset();
    store.apply({ accepted: true, cursor: ordinal, recited: [], skipped: [], wordCandidates: [], flags: [] });
  }, [controller, index, store]);

  const revealWord = useCallback(() => {
    const next = controller.nextExpectedWord();
    if (next) controller.reveal([next]);
  }, [controller]);

  const revealAyah = useCallback(() => {
    const next = controller.nextExpectedWord();
    if (!next) return;
    const count = index.ayahWordCount(next.surah, next.ayah);
    const keys: WordKey[] = [];
    for (let wordIndex = next.wordIndex; wordIndex <= count; wordIndex += 1) keys.push({ ...next, wordIndex });
    controller.reveal(keys);
  }, [controller, index]);

  const returnToPosition = useCallback(() => viewRef.current?.resumeFollow(), []);

  // ── Reading-mode helpers ───────────────────────────────────────────────
  const isBookmarked = bookmarks.some((b) => b.key.surah === focusKey.surah && b.key.ayah === focusKey.ayah);
  const toggleBookmark = () => {
    if (isBookmarked) {
      setBookmarks((previous) => previous.filter((b) => !(b.key.surah === focusKey.surah && b.key.ayah === focusKey.ayah)));
      return;
    }
    const preview = defaultQuranProvider.getAyah(focusKey.surah, focusKey.ayah).then((ayah) => ayah.textUthmani.slice(0, 45));
    void preview.then((textPreview) =>
      setBookmarks((previous) => [
        {
          id: `bm-${Date.now()}`,
          key: { surah: focusKey.surah, ayah: focusKey.ayah, wordIndex: 1 },
          surahName: surahMeta?.nameArabic ?? '',
          textPreview: `${textPreview}…`,
          page: pageOfWord(focusKey, index),
          createdAt: Date.now(),
        },
        ...previous,
      ]),
    );
  };

  const toggleAudio = () => {
    if (isAudioPlaying) defaultAudioPlayback.pause();
    else defaultAudioPlayback.playAyah(focusKey.surah, focusKey.ayah);
  };

  const liveMode = mode === 'TASMEE' || mode === 'CORRECTION';

  // Start the audio device while the reader settles in, not on the mic tap.
  useEffect(() => {
    if (!liveMode || (options.useMicrophone ?? devParams.mic) === false) return;
    // Safari has no requestIdleCallback; fall back to a short timeout.
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(prewarmMicrophone, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(prewarmMicrophone, 300);
    return () => window.clearTimeout(handle);
  }, [liveMode, options.useMicrophone, devParams.mic]);
  const startHint = selectedKey
    ? `البدء من ${SURAH_METADATA[selectedKey.surah - 1]?.nameArabic ?? ''} ${selectedKey.ayah}`
    : 'من أول الصفحة، أو اضغط كلمة للبدء منها';

  return (
    <div className="sm-app min-h-screen" dir="rtl">
      <div
        ref={navRef}
        className="sticky z-30 bg-[#FAF6EE]/92 dark:bg-[#1A1114]/92"
        style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <MushafNavBar
          currentMode={mode}
          onSelectMode={handleSelectMode}
          onOpenIndex={() => setIsNavModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isDarkMode={preferences.darkMode}
          onToggleDarkMode={() => updatePreferences({ darkMode: !preferences.darkMode })}
          surahName={surahMeta?.nameArabic ?? 'الفاتحة'}
          juzNumber={juzNumber}
        />
      </div>

      <main
        className="w-full max-w-3xl mx-auto px-1 sm:px-4 pt-2"
        style={{ paddingBottom: bottomInset + 16 }}
      >
        <QcfResourcesContext.Provider value={options.resources ?? browserQcfResources}>
          <MushafLiveContext.Provider value={live}>
            <QcfMushafView
              ref={viewRef}
              initialPage={initialPage}
              followEnabled={preferences.autoFollow && liveMode}
              topInset={topInset}
              bottomInset={bottomInset}
              maskMode={mode === 'TASMEE' ? 'tasmee' : 'none'}
              showConfirmed={preferences.showRecitedWords}
              onVisiblePageChange={onVisiblePageChange}
              onFollowAwayChange={setFollowAway}
              onWordActivate={onWordActivate}
            />
          </MushafLiveContext.Provider>
        </QcfResourcesContext.Provider>
      </main>

      <div ref={bottomRef}>
        {liveMode ? (
          <LiveRecitationDock
            controller={controller}
            mode={mode}
            onStart={startSession}
            onStop={() => void stopSession(true)}
            onRevealWord={revealWord}
            onRevealAyah={revealAyah}
            followAway={followAway}
            onReturnToPosition={returnToPosition}
            startHint={startHint}
          />
        ) : mode === 'TEACHER' ? (
          <TeacherModeShell
            surahNumber={focusKey.surah}
            currentAyah={focusKey.ayah}
            totalAyahs={surahMeta?.totalAyahs ?? 7}
            onNextAyah={() => {
              if (surahMeta && focusKey.ayah < surahMeta.totalAyahs) goToWord({ surah: focusKey.surah, ayah: focusKey.ayah + 1, wordIndex: 1 });
            }}
            onPrevAyah={() => {
              if (focusKey.ayah > 1) goToWord({ surah: focusKey.surah, ayah: focusKey.ayah - 1, wordIndex: 1 });
            }}
          />
        ) : (
          <ReadingControls
            onPrevSurah={() => focusKey.surah > 1 && handleSelectSurah(focusKey.surah - 1)}
            onNextSurah={() => focusKey.surah < 114 && handleSelectSurah(focusKey.surah + 1)}
            onToggleAudio={toggleAudio}
            isAudioPlaying={isAudioPlaying}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenBookmarks={() => setIsBookmarksModalOpen(true)}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
            surahNumber={focusKey.surah}
            ayahNumber={focusKey.ayah}
          />
        )}
      </div>

      <NavigationModal
        isOpen={isNavModalOpen}
        onClose={() => setIsNavModalOpen(false)}
        onSelectSurah={handleSelectSurah}
        onSelectJuz={handleSelectJuz}
        onSelectPage={goToPage}
        currentSurah={focusKey.surah}
      />
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        quranProvider={defaultQuranProvider}
        onSelectResult={goToWord}
      />
      <BookmarksModal
        isOpen={isBookmarksModalOpen}
        onClose={() => setIsBookmarksModalOpen(false)}
        bookmarks={bookmarks}
        onSelectBookmark={goToWord}
        onDeleteBookmark={(id) => setBookmarks((previous) => previous.filter((b) => b.id !== id))}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        preferences={preferences}
        onUpdate={updatePreferences}
      />
      <SessionSummaryModal
        summary={summary}
        isOpen={summary !== null}
        onClose={() => setSummary(null)}
        onRestart={() => {
          setSummary(null);
          startSession();
        }}
      />

      {LiveDiagnosticsPanel && (
        <Suspense fallback={null}>
          <LiveDiagnosticsPanel
            controller={controller}
            meter={meter}
            providerKind={providerKind}
            onProviderKind={setProviderKind}
            scenario={scenarioName}
            onScenario={setScenarioName}
          />
        </Suspense>
      )}
    </div>
  );
}
