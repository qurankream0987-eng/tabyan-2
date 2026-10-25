import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  applyProviderObservation,
  createSmartMushafState,
  statusForWord,
  wordKeyId,
} from "@/lib/smart-mushaf/SmartMushafState";
import type {
  ObservationStatus,
  SmartMushafState,
  WordKey,
} from "@/lib/smart-mushaf/SmartMushafState";
import { MockUiRecitationProvider } from "@/lib/smart-mushaf/RecitationProvider";
import { trpc } from "@/providers/trpc";
import "./smart-mushaf-prototype.css";

type ReadingMode = "normal" | "tasmee";

export default function SmartMushafPrototype() {
  const configurationQuery = trpc.quranFoundation.configuration.useQuery();
  const chaptersQuery = trpc.quranFoundation.chapters.useQuery(undefined, {
    enabled: configurationQuery.data?.configured === true && configurationQuery.data?.enabled === true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number | null>(null);
  const [jumpValue, setJumpValue] = useState("");
  const [mode, setMode] = useState<ReadingMode>("normal");
  const [readerState, setReaderState] = useState<SmartMushafState>(() => createSmartMushafState());
  const [demoIndex, setDemoIndex] = useState(0);
  const mockProvider = useRef<MockUiRecitationProvider | null>(null);
  if (import.meta.env.DEV && mockProvider.current === null) {
    mockProvider.current = new MockUiRecitationProvider();
  }

  useEffect(() => {
    document.title = "المصحف الذكي — تبيان";
    return () => {
      document.title = "تبيان — منصة قرآنية";
    };
  }, []);

  const availableChapters = useMemo(() => {
    if (!configurationQuery.data?.configured || !configurationQuery.data?.enabled) return [];
    const rows = chaptersQuery.data ?? [];
    if (
      configurationQuery.data?.environment === "prelive" ||
      configurationQuery.data?.availableChapterScope === "two-chapters"
    ) {
      return rows.filter((chapter) => chapter.id === 1 || chapter.id === 2);
    }
    return rows;
  }, [
    chaptersQuery.data,
    configurationQuery.data?.availableChapterScope,
    configurationQuery.data?.configured,
    configurationQuery.data?.enabled,
    configurationQuery.data?.environment,
  ]);

  useEffect(() => {
    if (availableChapters.length === 0) {
      setSelectedChapterId(null);
      setPageNumber(null);
      return;
    }
    const selected = availableChapters.find((chapter) => chapter.id === selectedChapterId);
    if (!selected) {
      const first = availableChapters[0];
      setSelectedChapterId(first.id);
      setPageNumber(first.firstPage);
    }
  }, [availableChapters, selectedChapterId]);

  const selectedChapter = availableChapters.find((chapter) => chapter.id === selectedChapterId) ?? null;
  const pageWithinChapter =
    selectedChapter?.firstPage != null &&
    selectedChapter.lastPage != null &&
    pageNumber != null &&
    pageNumber >= selectedChapter.firstPage &&
    pageNumber <= selectedChapter.lastPage;
  const activePage = pageWithinChapter ? pageNumber : null;
  const pageQuery = trpc.quranFoundation.page.useQuery(
    { pageNumber: activePage ?? 1 },
    { enabled: activePage !== null },
  );

  const pageData = pageQuery.data;
  const wordEntries = useMemo(() => {
    if (!pageData) return [] as Array<{ key: WordKey; id: string }>;
    return pageData.verses.flatMap((verse) =>
      verse.words.flatMap((word) => {
        if (word.kind !== "word" || word.wordIndex === null) return [];
        const key: WordKey = {
          surah: verse.surah,
          ayah: verse.ayah,
          wordIndex: word.wordIndex,
        };
        return [{ key, id: wordKeyId(key) }];
      }),
    );
  }, [pageData]);
  const validWordKeys = useMemo(() => new Set(wordEntries.map((entry) => entry.id)), [wordEntries]);

  useEffect(() => {
    const provider = mockProvider.current;
    if (!provider) return;
    return provider.subscribe((observation) => {
      setReaderState((current) => applyProviderObservation(current, observation, validWordKeys));
    });
  }, [validWordKeys]);

  useEffect(() => {
    setReaderState(createSmartMushafState());
    setDemoIndex(0);
  }, [activePage]);

  const retryAll = () => {
    void configurationQuery.refetch();
    void chaptersQuery.refetch();
    if (activePage !== null) void pageQuery.refetch();
  };

  const chooseChapter = (chapterId: number) => {
    const chapter = availableChapters.find((item) => item.id === chapterId);
    if (!chapter) return;
    setSelectedChapterId(chapter.id);
    setPageNumber(chapter.firstPage);
    setJumpValue("");
  };

  const changePage = (nextPage: number) => {
    if (!selectedChapter?.firstPage || !selectedChapter.lastPage) return;
    if (nextPage < selectedChapter.firstPage || nextPage > selectedChapter.lastPage) return;
    setPageNumber(nextPage);
    setJumpValue("");
  };

  const jumpToPage = () => {
    const target = Number(jumpValue);
    if (!Number.isInteger(target) || !selectedChapter?.firstPage || !selectedChapter.lastPage) return;
    changePage(target);
  };

  const applyDemoEvent = (status: ObservationStatus) => {
    const provider = mockProvider.current;
    if (!provider || wordEntries.length === 0) return;
    const keyIndex = demoIndex % wordEntries.length;
    const key = wordEntries[keyIndex]?.key;
    const observation = status === "unknown"
      ? { status }
      : {
          status,
          wordKey: key,
          stabilized: status !== "current",
        };
    provider.emit(observation);
    if (status !== "current") setDemoIndex((index) => index + 1);
  };

  const configuration = configurationQuery.data;
  const configurationError = configurationQuery.error;
  const chapterError = chaptersQuery.error;
  const pageErrorCode = (pageQuery.error as { data?: { code?: string } } | null)?.data?.code;
  const loadingSetup = configurationQuery.isLoading || chaptersQuery.isLoading;

  return (
    <main className="smart-mushaf" dir="rtl" data-testid="smart-mushaf-page">
      <div className="sm-shell">
        <header className="sm-topline">
          <div className="sm-brand" data-testid="text-smart-mushaf-brand">
            <span className="sm-brand-mark" aria-hidden="true">ت</span>
            <span>تبيان</span>
          </div>
          <span className="sm-prototype-tag" data-testid="text-prototype-label">نسخة تجريبية · المصحف الذكي</span>
        </header>

        <section className="sm-intro" aria-labelledby="sm-title">
          <div>
            <p className="sm-eyebrow">مساحة قراءة وتثبيت</p>
            <h1 className="sm-title" id="sm-title">على مهل… كلمةً كلمة</h1>
            <p className="sm-subtitle">
              قراءة هادئة ومراجعة متدرجة. المحتوى القرآني هنا من Quran Foundation،
              وهذا عرض بتدفّق النص ولا يدّعي مطابقة تخطيط مصحف QPC ذي الصفحات الـ604.
            </p>
          </div>
          {configuration && (
            <span className="sm-environment" data-testid="status-quran-environment">
              {configuration.environment === "prelive" ? "بيئة ما قبل الإطلاق" : "بيئة الإنتاج"}
              {configuration.availableChapterScope === "two-chapters" ? " · نطاق فصلين" : " · نطاق بيئة الإنتاج"}
            </span>
          )}
        </section>

        {loadingSetup ? (
          <section className="sm-reader-card" aria-label="جارٍ تحميل بيانات القراءة" data-testid="status-reader-loading">
            <div className="sm-skeleton" style={{ width: "30%", height: 18 }} />
            <div className="sm-verses" aria-hidden="true">
              <div className="sm-skeleton sm-skeleton-line" />
              <div className="sm-skeleton sm-skeleton-line" />
              <div className="sm-skeleton sm-skeleton-line" />
            </div>
          </section>
        ) : configurationError ? (
          <StatePanel
            testId="status-configuration-error"
            title="تعذّر التحقق من إعداد المصدر"
            description="لم نتمكن من قراءة حالة اتصال Quran Foundation. أعد المحاولة؛ لن نعرض نصاً بديلاً."
            action={<button className="sm-button sm-button-primary" onClick={retryAll} data-testid="button-retry-configuration">إعادة المحاولة</button>}
          />
        ) : configuration && !configuration.configured ? (
          <StatePanel
            testId="status-quran-unconfigured"
            title="المصدر غير مُعدّ بعد"
            description="لم تُضبط بيانات Quran Foundation على الخادم. ستظهر القراءة هنا بعد تهيئة المصدر، من دون استبدالها بنص تجريبي."
          />
        ) : configuration && !configuration.enabled ? (
          <StatePanel
            testId="status-quran-disabled"
            title="المصدر متوقف حتى اعتماد الإعدادات"
            description="لم يُفعّل جلب المحتوى من Quran Foundation. لا نجري أي طلب للمحتوى قبل تهيئة المصدر واعتماد متطلبات استخدامه."
          />
        ) : chapterError ? (
          <StatePanel
            testId="status-chapters-error"
            title="تعذّر تحميل قائمة السور"
            description="لم تصلنا قائمة السور من المصدر. يمكنك إعادة المحاولة لاحقاً."
            action={<button className="sm-button sm-button-primary" onClick={retryAll} data-testid="button-retry-chapters">إعادة المحاولة</button>}
          />
        ) : availableChapters.length === 0 ? (
          <StatePanel
            testId="status-chapters-empty"
            title="لا توجد سور متاحة للقراءة الآن"
            description="لم يُرجع المصدر سوراً متاحة في هذه البيئة. لا نعرض محتوى محلياً بديلاً."
          />
        ) : !selectedChapter || selectedChapter.firstPage === null || selectedChapter.lastPage === null ? (
          <StatePanel
            testId="status-chapter-pages-unavailable"
            title="نطاق الصفحات غير متاح"
            description="لم يُرجع المصدر نطاق صفحات لهذه السورة، لذلك لا يمكن فتح صفحة بالتخمين."
          />
        ) : (
          <>
            <section className="sm-controls" aria-label="التنقل في القراءة">
              <div className="sm-control-panel">
                <label className="sm-control-label" htmlFor="sm-chapter-select">السورة</label>
                <select
                  id="sm-chapter-select"
                  className="sm-select"
                  value={selectedChapter.id}
                  onChange={(event) => chooseChapter(Number(event.currentTarget.value))}
                  data-testid="select-chapter"
                >
                  {availableChapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.nameArabic} · {chapter.nameSimple}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm-control-panel">
                <span className="sm-control-label">الصفحة · من نطاق السورة المتاح</span>
                <div className="sm-control-row">
                  <button
                    className="sm-button"
                    onClick={() => activePage !== null && changePage(activePage - 1)}
                    disabled={activePage === null || activePage <= selectedChapter.firstPage}
                    data-testid="button-previous-page"
                    aria-label="الصفحة السابقة"
                  >السابق</button>
                  <input
                    className="sm-page-input"
                    aria-label="رقم الصفحة للانتقال"
                    type="number"
                    min={selectedChapter.firstPage}
                    max={selectedChapter.lastPage}
                    value={jumpValue}
                    placeholder={String(activePage ?? "")}
                    onChange={(event) => setJumpValue(event.currentTarget.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") jumpToPage(); }}
                    data-testid="input-jump-page"
                  />
                  <button
                    className="sm-button sm-button-primary"
                    onClick={jumpToPage}
                    disabled={!jumpValue || Number(jumpValue) < selectedChapter.firstPage || Number(jumpValue) > selectedChapter.lastPage}
                    data-testid="button-jump-page"
                  >انتقال</button>
                  <button
                    className="sm-button"
                    onClick={() => activePage !== null && changePage(activePage + 1)}
                    disabled={activePage === null || activePage >= selectedChapter.lastPage}
                    data-testid="button-next-page"
                    aria-label="الصفحة التالية"
                  >التالي</button>
                </div>
              </div>
            </section>

            <section className="sm-mode-row" aria-label="اختيار طريقة القراءة">
              <div className="sm-mode-copy">
                <strong>طريقة العرض</strong>
                <span>{mode === "normal" ? "النص كامل للقراءة الهادئة" : "تظهر الكلمات عند تأكيد موضعها"}</span>
              </div>
              <div className="sm-mode-switch" role="group" aria-label="وضع القراءة">
                <button
                  type="button"
                  aria-pressed={mode === "normal"}
                  onClick={() => setMode("normal")}
                  data-testid="button-mode-normal"
                >قراءة</button>
                <button
                  type="button"
                  aria-pressed={mode === "tasmee"}
                  onClick={() => setMode("tasmee")}
                  data-testid="button-mode-tasmee"
                >تسميع</button>
              </div>
            </section>

            {activePage === null ? (
              <StatePanel
                testId="status-page-range-invalid"
                title="اختر صفحة ضمن نطاق السورة"
                description={`الصفحات المتاحة لهذه السورة من ${selectedChapter.firstPage} إلى ${selectedChapter.lastPage}.`}
              />
            ) : pageQuery.isLoading ? (
              <section className="sm-reader-card" aria-label="جارٍ تحميل الصفحة" data-testid="status-page-loading">
                <div className="sm-skeleton" style={{ width: "32%", height: 18 }} />
                <div className="sm-verses" aria-hidden="true">
                  <div className="sm-skeleton sm-skeleton-line" />
                  <div className="sm-skeleton sm-skeleton-line" />
                  <div className="sm-skeleton sm-skeleton-line" />
                </div>
              </section>
            ) : pageQuery.error ? (
              <StatePanel
                testId={pageErrorCode === "NOT_FOUND" ? "status-page-unavailable" : "status-page-error"}
                title={pageErrorCode === "NOT_FOUND" ? "هذه الصفحة غير متاحة من المصدر" : "تعذّر تحميل الصفحة"}
                description={pageErrorCode === "NOT_FOUND"
                  ? "لم يُرجع Quran Foundation محتوى لهذه الصفحة ضمن النطاق الحالي."
                  : "لم نتمكن من جلب كلمات الصفحة من Quran Foundation. لا نعرض نصاً بديلاً."}
                action={<button className="sm-button sm-button-primary" onClick={() => void pageQuery.refetch()} data-testid="button-retry-page">إعادة المحاولة</button>}
              />
            ) : !pageData || pageData.verses.length === 0 ? (
              <StatePanel
                testId="status-page-empty"
                title="لا يوجد محتوى لهذه الصفحة"
                description="لم يُرجع المصدر آيات لهذه الصفحة. جرّب صفحة أخرى ضمن النطاق المتاح."
              />
            ) : (
              <>
                <article className="sm-reader-card" data-testid={`content-quran-page-${pageData.pageNumber}`}>
                  <header className="sm-reader-head">
                    <h2 className="sm-chapter-heading" data-testid="text-current-chapter">{selectedChapter.nameArabic}</h2>
                    <span className="sm-page-meta" data-testid="text-current-page">
                      صفحة {pageData.pageNumber} · {pageData.verses.length} آيات
                    </span>
                  </header>
                  <div className="sm-verses" lang="ar" dir="rtl" data-testid="content-quran-verses">
                    {pageData.verses.map((verse) => (
                      <span className="sm-verse" key={verse.verseKey} data-testid={`verse-${verse.verseKey}`}>
                        {verse.words.map((word, index) => {
                          const key = word.kind === "word" && word.wordIndex !== null
                            ? { surah: verse.surah, ayah: verse.ayah, wordIndex: word.wordIndex }
                            : null;
                          const status = key ? statusForWord(readerState, key) : null;
                          const hidden = mode === "tasmee" && key !== null && status !== "current" &&
                            status !== "confirmed" && status !== "incorrect" && status !== "skipped" && status !== "repeated";
                          return (
                            <span
                              key={`${verse.verseKey}-${index}`}
                              className={[
                                key ? "sm-word" : "sm-verse-marker",
                                key && mode === "tasmee" ? `sm-word-${hidden ? "hidden" : status}` : "",
                              ].filter(Boolean).join(" ")}
                              data-testid={key ? `word-${verse.verseKey}-${word.wordIndex}` : `marker-${verse.verseKey}-${index}`}
                              data-word-status={key ? (hidden ? "hidden" : status) : undefined}
                            >
                              <span aria-hidden={hidden || undefined}>{word.text}</span>
                              {hidden && <span className="sm-sr-only">كلمة مخفية حتى تأكيدها</span>}
                            </span>
                          );
                        })}
                        <span className="sm-verse-marker" aria-label={`نهاية الآية ${verse.ayah}`}>· {verse.ayah}</span>
                      </span>
                    ))}
                  </div>
                  <footer className="sm-reader-foot">
                    <span>نص المصدر كما ورد، دون تعديل</span>
                    {mode === "tasmee" && (
                      <span className="sm-status-legend" aria-label="دليل حالات الكلمات">
                        <span className="sm-legend-item"><i className="sm-legend-dot" />الحالية</span>
                        <span className="sm-legend-item"><i className="sm-legend-dot confirmed" />مؤكدة</span>
                        <span className="sm-legend-item"><i className="sm-legend-dot error" />مراجعة</span>
                      </span>
                    )}
                  </footer>
                </article>

                {import.meta.env.DEV && (
                  <section className="sm-mock-panel" aria-label="أحداث واجهة محاكاة للمطور" data-testid="panel-mock-provider">
                    <p className="sm-mock-title">
                      <span>أحداث واجهة للمطور</span>
                      <span className="sm-mock-label">PROVIDER_MODE=MOCK_UI</span>
                    </p>
                    <p className="sm-mock-note">أحداث UI اصطناعية فقط؛ هذه ليست تعرّفاً على التلاوة ولا تستخدم الميكروفون.</p>
                    <div className="sm-mock-actions">
                      <button className="sm-button" onClick={() => applyDemoEvent("current")} data-testid="button-mock-current">الحالية</button>
                      <button className="sm-button" onClick={() => applyDemoEvent("confirmed")} data-testid="button-mock-confirmed">مؤكدة</button>
                      <button className="sm-button" onClick={() => applyDemoEvent("incorrect")} data-testid="button-mock-incorrect">غير صحيحة</button>
                      <button className="sm-button" onClick={() => applyDemoEvent("skipped")} data-testid="button-mock-skipped">متروكة</button>
                      <button className="sm-button" onClick={() => applyDemoEvent("repeated")} data-testid="button-mock-repeated">مكررة</button>
                      <button className="sm-button" onClick={() => applyDemoEvent("unknown")} data-testid="button-mock-unknown">موضع غير محدد</button>
                    </div>
                    {readerState.notice === "unknown-position" && (
                      <p className="sm-mock-note" role="status" data-testid="status-unknown-position">
                        موضع غير محدد؛ لم تُسند الملاحظة إلى أي كلمة.
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}

        <p className="sm-source-note" data-testid="text-quran-foundation-attribution">
          المحتوى القرآني مقدّم من{" "}
          <a href="https://quran.foundation/" target="_blank" rel="noreferrer" data-testid="link-quran-foundation">
            Quran Foundation
          </a>
          {" "}· عرض بتدفّق النص، وليس تخطيط مصحف QPC ذي 604 صفحات.
        </p>
      </div>
    </main>
  );
}

function StatePanel({
  testId,
  title,
  description,
  action,
}: {
  testId: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="sm-state-panel" role="status" data-testid={testId}>
      <span className="sm-state-mark" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </section>
  );
}
