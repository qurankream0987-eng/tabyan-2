/**
 * إعداد «اختبار الحفظ» (Part 25, 27): النطاق + الإعدادات.
 * النطاقات غير المدعومة ببيانات موثوقة (حزب/ربع) تظهر معطّلة مع السبب.
 */
import { useMemo, useState } from "react";
import Icon from "@/components/app/Icon";
import { SURAHS, JUZ_LIST, TOTAL_PAGES } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { readAccountStorage, writeAccountStorage } from "@/lib/account-storage";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";
import {
  DEFAULT_TEST_SETTINGS, resolveScope, SCOPE_AVAILABILITY,
  type TestScope, type TestScopeKind, type TestSettings,
} from "@/lib/recitation-ai/memorizationTest";
import ReaderSheet from "./ReaderSheet";
import { SwitchRow } from "./RecitationSessionSettingsSheet";

interface Props {
  accountId: string | null;
  currentPage: number;
  currentSurah: number;
  currentJuz: number;
  aiAvailable: boolean;
  hideMarkers: boolean;
  onHideMarkersChange: (value: boolean) => void;
  onStart: (scope: TestScope, settings: TestSettings) => void;
  onClose: () => void;
  busy?: boolean;
}

const SCOPE_ORDER: TestScopeKind[] = ["surah", "juz", "hizb", "rub", "page", "ayahs", "custom"];
const SETTINGS_KEY = "tabyan.memorizationTest.settings";

function loadSettings(accountId: string | null): TestSettings {
  try {
    const raw = readAccountStorage(accountId, SETTINGS_KEY);
    if (raw) return { ...DEFAULT_TEST_SETTINGS, ...(JSON.parse(raw) as Partial<TestSettings>) };
  } catch { /* الافتراضي */ }
  return DEFAULT_TEST_SETTINGS;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block min-w-0">
      <span className="tby-sheet-muted font-readex text-[11px] mb-1 block">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={value}
        onChange={(e) => {
          const raw = normalizeDigits(e.target.value).replace(/\D/g, "");
          if (raw) onChange(Math.max(min, Math.min(max, Number(raw))));
        }}
        className="w-full h-11 rounded-xl border border-[var(--mushaf-chrome-border)] bg-transparent px-3 font-readex text-sm text-center outline-none focus:border-[var(--mushaf-primary)]"
      />
    </label>
  );
}

function SurahSelect({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <label className="block min-w-0">
      <span className="tby-sheet-muted font-readex text-[11px] mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-11 rounded-xl border border-[var(--mushaf-chrome-border)] bg-[var(--mushaf-chrome-solid)] px-3 font-readex text-sm outline-none focus:border-[var(--mushaf-primary)]"
      >
        {SURAHS.map((s) => <option key={s.n} value={s.n}>{toArabicDigits(s.n)}. {s.name}</option>)}
      </select>
    </label>
  );
}

function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="font-readex text-[12px] font-bold mb-1.5">{label}</p>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className="tby-option flex-1 h-10 font-readex text-[12px] font-bold"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MemorizationTestSetupSheet({
  accountId, currentPage, currentSurah, currentJuz, aiAvailable, hideMarkers, onHideMarkersChange, onStart, onClose, busy,
}: Props) {
  const [kind, setKind] = useState<TestScopeKind>("surah");
  const [surah, setSurah] = useState(currentSurah);
  const [juz, setJuz] = useState(currentJuz);
  const [page, setPage] = useState(currentPage);
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(Math.min(10, SURAHS[currentSurah - 1]?.ayahs ?? 7));
  const [customFrom, setCustomFrom] = useState({ surah: currentSurah, ayah: 1 });
  const [customTo, setCustomTo] = useState({ surah: currentSurah, ayah: SURAHS[currentSurah - 1]?.ayahs ?? 7 });
  const [settings, setSettings] = useState<TestSettings>(() => loadSettings(accountId));

  const scope: TestScope | null = useMemo(() => {
    switch (kind) {
      case "surah": return { kind, surah };
      case "juz": return { kind, juz };
      case "page": return { kind, page };
      case "ayahs": return fromAyah <= toAyah ? { kind, surah, from: fromAyah, to: toAyah } : null;
      case "custom": {
        const valid = customFrom.surah < customTo.surah || (customFrom.surah === customTo.surah && customFrom.ayah <= customTo.ayah);
        return valid ? { kind, from: customFrom, to: customTo } : null;
      }
      default: return null;
    }
  }, [kind, surah, juz, page, fromAyah, toAyah, customFrom, customTo]);
  const ayahCount = useMemo(() => (scope ? resolveScope(scope).length : 0), [scope]);
  const patch = (value: Partial<TestSettings>) => setSettings((s) => ({ ...s, ...value }));
  const maxAyah = SURAHS[surah - 1]?.ayahs ?? 1;

  const start = () => {
    if (!scope || ayahCount < settings.ayahsPerQuestion) return;
    writeAccountStorage(accountId, SETTINGS_KEY, JSON.stringify(settings));
    onStart(scope, settings);
  };

  return (
    <ReaderSheet
      title="اختبار الحفظ"
      subtitle={aiAvailable ? "تبيان AI يتابع تلاوتك ويكشفها" : "تقييم ذاتي: اكشف الإجابة ثم قيّم نفسك"}
      onClose={onClose}
      footer={(
        <button
          type="button"
          onClick={start}
          disabled={!scope || ayahCount < settings.ayahsPerQuestion || busy}
          className="tby-primary-action w-full h-12 rounded-2xl font-readex text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          {busy
            ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden />
            : <Icon name="check-square" size={17} />}
          ابدأ الاختبار
          {scope && ayahCount > 0 && (
            <span className="font-normal opacity-80">· {toArabicDigits(Math.min(settings.questionCount, ayahCount))} أسئلة</span>
          )}
        </button>
      )}
    >
      <section aria-label="نطاق الاختبار" className="pt-1">
        <p className="font-readex text-sm font-bold mb-2">النطاق</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="نوع النطاق">
          {SCOPE_ORDER.map((key) => {
            const availability = SCOPE_AVAILABILITY[key];
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={kind === key}
                disabled={!availability.available}
                title={availability.note}
                onClick={() => setKind(key)}
                className="tby-option h-9 px-3 font-readex text-[12px] font-bold disabled:opacity-40"
              >
                {availability.label}
              </button>
            );
          })}
        </div>
        <p className="tby-sheet-muted font-readex text-[10px] mt-1.5">الحزب والربع غير متاحين: حدودهما على مستوى الآية غير موجودة في بيانات المصحف الحالية.</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(kind === "surah" || kind === "ayahs") && (
            <div className="col-span-2">
              <SurahSelect label="السورة" value={surah} onChange={(n) => { setSurah(n); setFromAyah(1); setToAyah(Math.min(10, SURAHS[n - 1]?.ayahs ?? 1)); }} />
            </div>
          )}
          {kind === "ayahs" && (
            <>
              <NumberField label="من آية" value={fromAyah} min={1} max={maxAyah} onChange={(v) => { setFromAyah(v); if (toAyah < v) setToAyah(v); }} />
              <NumberField label="إلى آية" value={toAyah} min={fromAyah} max={maxAyah} onChange={setToAyah} />
            </>
          )}
          {kind === "juz" && (
            <label className="col-span-2 block">
              <span className="tby-sheet-muted font-readex text-[11px] mb-1 block">الجزء</span>
              <select
                value={juz}
                onChange={(e) => setJuz(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-[var(--mushaf-chrome-border)] bg-[var(--mushaf-chrome-solid)] px-3 font-readex text-sm outline-none"
              >
                {JUZ_LIST.map((j) => <option key={j.n} value={j.n}>{j.name}</option>)}
              </select>
            </label>
          )}
          {kind === "page" && (
            <div className="col-span-2">
              <NumberField label={`الصفحة (١–${toArabicDigits(TOTAL_PAGES)})`} value={page} min={1} max={TOTAL_PAGES} onChange={setPage} />
            </div>
          )}
          {kind === "custom" && (
            <>
              <SurahSelect label="من سورة" value={customFrom.surah} onChange={(n) => setCustomFrom({ surah: n, ayah: 1 })} />
              <NumberField label="من آية" value={customFrom.ayah} min={1} max={SURAHS[customFrom.surah - 1]?.ayahs ?? 1} onChange={(v) => setCustomFrom((c) => ({ ...c, ayah: v }))} />
              <SurahSelect label="إلى سورة" value={customTo.surah} onChange={(n) => setCustomTo({ surah: n, ayah: SURAHS[n - 1]?.ayahs ?? 1 })} />
              <NumberField label="إلى آية" value={customTo.ayah} min={1} max={SURAHS[customTo.surah - 1]?.ayahs ?? 1} onChange={(v) => setCustomTo((c) => ({ ...c, ayah: v }))} />
            </>
          )}
        </div>
        <p className="tby-sheet-muted font-readex text-[11px] mt-2" aria-live="polite">
          {scope ? `${toArabicDigits(ayahCount)} آية في النطاق` : "النطاق غير صالح"}
        </p>
      </section>

      <section aria-label="إعدادات الاختبار" className="mt-5 space-y-4">
        <Segmented
          label="عدد الأسئلة"
          value={settings.questionCount}
          options={[3, 5, 10].map((n) => ({ value: n, label: toArabicDigits(n) }))}
          onChange={(questionCount) => patch({ questionCount })}
        />
        <Segmented
          label="طول السؤال"
          value={settings.ayahsPerQuestion}
          options={[{ value: 1 as const, label: "آية" }, { value: 2 as const, label: "آيتان" }, { value: 3 as const, label: "٣ آيات" }]}
          onChange={(ayahsPerQuestion) => patch({ ayahsPerQuestion })}
        />
        <Segmented
          label="كلمات البداية الظاهرة"
          value={settings.cueWords}
          options={[2, 3, 5].map((n) => ({ value: n, label: toArabicDigits(n) }))}
          onChange={(cueWords) => patch({ cueWords })}
        />
        <div className="space-y-2">
          <SwitchRow label="إظهار الموضع" description="اسم السورة ورقم الآية ظاهران منذ البداية." checked={settings.showLocation} onChange={(showLocation) => patch({ showLocation })} />
          <SwitchRow label="إخفاء علامات الآيات" description="أصعب: تختفي أرقام الآيات دون تغيير مواضع الأسطر." checked={hideMarkers} onChange={onHideMarkersChange} />
          <SwitchRow label="تنبيه صوتي عند انتهاء السؤال" description="نغمة قصيرة هادئة." checked={settings.sound} onChange={(sound) => patch({ sound })} />
          <SwitchRow label="جلسة مؤقتة" description="لا تُحفظ نتيجة هذا الاختبار في السجل." checked={settings.temporary} onChange={(temporary) => patch({ temporary })} />
        </div>
      </section>
    </ReaderSheet>
  );
}
