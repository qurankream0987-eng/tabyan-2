/**
 * MushafSearchSheet — بحث سريع داخل القارئ.
 * يدعم: اسم السورة / رقم الصفحة / رقم السورة / الآية ("٢:٢٥٥" أو "البقرة ٢٥٥").
 * البحث لحظي (محلي — بلا شبكة).
 * ملاحظة: البحث النصي في ألفاظ الآيات غير مدعوم — بيانات العرض QCF glyphs
 * وليست نصاً عربياً قابلاً للمطابقة (لا نص عثماني نصي في المشروع).
 */
import { useState, useMemo } from "react";
import Icon from "@/components/app/Icon";
import { SURAHS, TOTAL_PAGES } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { pageOfAyah } from "@/lib/mushaf/page-index";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

interface Props {
  onNavigate: (page: number) => void;
  onClose: () => void;
}

interface Result {
  type: "surah" | "page" | "ayah";
  label: string;
  sub: string;
  page: number;
}

/** نتيجة آية واحدة إن كانت (سورة، آية) صحيحة */
function ayahResult(surahN: number, ayahN: number): Result | null {
  const s = SURAHS[surahN - 1];
  if (!s || ayahN < 1 || ayahN > s.ayahs) return null;
  const page = pageOfAyah(surahN, ayahN);
  return {
    type: "ayah",
    label: `${s.name} — الآية ${toArabicDigits(ayahN)}`,
    sub: `صفحة ${toArabicDigits(page)}`,
    page,
  };
}

function buildResults(qRaw: string): Result[] {
  const trimmed = normalizeDigits(qRaw.trim());
  if (!trimmed) return [];
  const results: Result[] = [];

  // آية بصيغة "سورة:آية" أو "سورة ٢٥٥" بالأرقام (مثل 2:255)
  const refMatch = trimmed.match(/^(\d{1,3})\s*[:\s]\s*(\d{1,3})$/);
  if (refMatch) {
    const r = ayahResult(Number(refMatch[1]), Number(refMatch[2]));
    if (r) results.push(r);
  }

  // آية بصيغة "اسم السورة + رقم الآية" (مثل: البقرة 255)
  const nameAyah = trimmed.match(/^(.+?)\s+(\d{1,3})$/);
  if (nameAyah) {
    const namePart = nameAyah[1].trim();
    const ayahN = Number(nameAyah[2]);
    const s = SURAHS.find(
      (x) => x.name === namePart || x.name.includes(namePart) || x.englishName.toLowerCase() === namePart.toLowerCase()
    );
    if (s) {
      const r = ayahResult(s.n, ayahN);
      if (r) results.push(r);
    }
  }

  // رقم الصفحة مباشرةً
  const asNum = parseInt(trimmed, 10);
  if (!isNaN(asNum) && String(asNum) === trimmed && asNum >= 1 && asNum <= TOTAL_PAGES) {
    results.push({ type: "page", label: `صفحة ${toArabicDigits(asNum)}`, sub: "الانتقال المباشر", page: asNum });
  }

  // أسماء السور
  const lq = trimmed.toLowerCase();
  for (const s of SURAHS) {
    const matched =
      s.name.includes(trimmed) ||
      s.englishName.toLowerCase().includes(lq) ||
      String(s.n) === trimmed;
    if (matched) {
      results.push({
        type: "surah",
        label: s.name,
        sub: `${toArabicDigits(s.ayahs)} آية · صفحة ${toArabicDigits(s.startPage)}`,
        page: s.startPage,
      });
    }
    if (results.length >= 10) break;
  }

  return results;
}

export default function MushafSearchSheet({ onNavigate, onClose }: Props) {
  const [q, setQ] = useState("");
  const results = useMemo(() => buildResults(q), [q]);

  const go = (page: number) => { onNavigate(page); onClose(); };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 bg-[var(--card)] rounded-t-3xl flex flex-col max-h-[85vh]" style={{ touchAction: "auto" }}>
        {/* مقبض */}
        <div className="flex flex-col items-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-3">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
              <Icon name="x" size={17} />
            </button>
            <h2 className="font-amiri text-lg font-bold text-burgundy">بحث</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* حقل البحث */}
        <div className="px-4 pb-3 shrink-0">
          <div className="relative">
            <Icon name="search" size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="سورة، صفحة، أو آية (مثل: البقرة ٢٥٥)…"
              className="w-full rounded-2xl bg-muted/40 border border-input px-4 py-3 pr-10 font-readex text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-burgundy/30 dark:focus:ring-gold/30"
              dir="rtl"
            />
          </div>
        </div>

        {/* النتائج */}
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {q.trim() && results.length === 0 && (
            <div className="text-center py-10">
              <p className="font-amiri text-lg text-foreground mb-1">لا توجد نتائج</p>
              <p className="font-readex text-sm text-muted-foreground">جرّب اسم السورة، رقم الصفحة، أو آية مثل «البقرة ٢٥٥»</p>
            </div>
          )}

          {!q.trim() && (
            <div className="text-center py-8">
              <Icon name="search" size={32} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-readex text-sm text-muted-foreground">ابدأ بكتابة اسم السورة، رقم الصفحة، أو الآية</p>
            </div>
          )}

          <div className="space-y-px">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => go(r.page)}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted/40 transition text-right"
              >
                <div className="w-9 h-9 rounded-full bg-burgundy/8 dark:bg-gold/8 flex items-center justify-center shrink-0">
                  <Icon name={r.type === "surah" ? "books" : r.type === "ayah" ? "bookmark" : "arrow-left"} size={15} className="text-burgundy dark:text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-amiri text-base text-foreground leading-tight">{r.label}</div>
                  <div className="font-readex text-[10px] text-muted-foreground">{r.sub}</div>
                </div>
                <Icon name="arrow-left" size={13} className="text-muted-foreground/50 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
