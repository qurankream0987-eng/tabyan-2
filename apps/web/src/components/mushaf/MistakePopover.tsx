/**
 * MistakePopover — نافذة صغيرة عند النقر على كلمة معلَّمة (Part 49).
 *
 * تعرض: الكلمة المتوقعة (من نص المصحف الكنسي كما هو — لا توليد) · الحالة ·
 * هل صُحّحت · «ليست خطأ» (إعادة تصنيف لا حذف) · الاستماع للآية من مصدر
 * التلاوة المعتمد (معطّل أثناء الاستماع الحي كي لا يلتقطه الميكروفون).
 */
import { useEffect, useRef } from "react";
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import type { RecitationMistakeKind, RecitationWordState } from "@/lib/recitation-ai/recitationStateEngine";

export interface MistakePopoverData {
  index: number;
  verseKey: string;
  position: number;
  /** نص الكلمة الكنسي (Uthmani) من بيانات المصحف */
  expectedText: string;
  state: RecitationWordState;
  kind: RecitationMistakeKind | null;
  /** إحداثيات النقرة داخل القارئ */
  x: number;
  y: number;
}

const STATE_LABEL: Partial<Record<RecitationWordState, string>> = {
  CONFIRMED_ERROR: "خطأ مؤكد",
  POSSIBLE_ERROR: "خطأ محتمل — لم يتأكد بعد",
  CORRECTED: "صُحّح",
  PEEKED: "كُشفت بتلميح",
  SKIPPED: "لم تُقرأ (تخطٍّ)",
};

const KIND_LABEL: Record<RecitationMistakeKind, string> = {
  WRONG_WORD: "قُرئت كلمة مختلفة",
  OMISSION: "سقطت الكلمة",
  EXTRA_WORD: "زيادة كلمة",
  REPETITION: "تكرار",
  SKIP: "تخطي آية",
  UNEXPECTED_JUMP: "انتقال غير متوقع",
};

interface Props {
  data: MistakePopoverData;
  canReplay: boolean;
  onDismissMistake: (index: number) => void;
  onReplayAyah: (surahId: number, ayah: number) => void;
  onClose: () => void;
}

export default function MistakePopover({ data, canReplay, onDismissMistake, onReplayAyah, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [surahId, ayah] = data.verseKey.split(":").map(Number);
  const isMistake = data.state === "CONFIRMED_ERROR" || data.state === "POSSIBLE_ERROR" || data.state === "CORRECTED" || data.state === "SKIPPED";

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    };
    const onDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  // تموضع مقيّد داخل الشاشة: فوق النقرة إن اتسع، وإلا تحتها.
  const width = Math.min(288, window.innerWidth - 32);
  const left = Math.min(Math.max(16, data.x - width / 2), window.innerWidth - width - 16);
  const above = data.y > 260;
  const style = above ? { left, bottom: window.innerHeight - data.y + 18, width } : { left, top: data.y + 22, width };

  return (
    <div
      ref={ref}
      className="tby-popover p-3 outline-none"
      style={style}
      role="dialog"
      aria-label={`الكلمة ${data.position} من الآية ${ayah}`}
      tabIndex={-1}
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-readex text-[12px] font-bold leading-tight" style={{ color: data.state === "CONFIRMED_ERROR" ? "var(--mushaf-error)" : undefined }}>
            {STATE_LABEL[data.state] ?? "كلمة"}
          </p>
          {data.kind && isMistake && (
            <p className="tby-sheet-muted font-readex text-[11px] mt-0.5">{KIND_LABEL[data.kind]}</p>
          )}
        </div>
        <button type="button" onClick={onClose} className="tby-icon-btn !w-8 !h-8 -mt-1 -me-1" aria-label="إغلاق">
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="tby-sheet-card mt-2 px-3 py-2 text-center">
        <p className="tby-sheet-muted font-readex text-[10px]">الكلمة في المصحف</p>
        <p className="font-quran text-2xl leading-[1.8]" style={{ color: "var(--mushaf-ink)" }}>{data.expectedText}</p>
        <p className="tby-sheet-muted font-readex text-[10px]">
          {SURAHS[surahId - 1]?.name} · الآية {toArabicDigits(ayah)}
        </p>
      </div>

      <div className="mt-2 flex gap-2">
        {isMistake && (
          <button
            type="button"
            onClick={() => { onDismissMistake(data.index); onClose(); }}
            className="tby-chip flex-1 h-10 rounded-xl font-readex text-[12px] font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Icon name="check" size={14} />
            ليست خطأ
          </button>
        )}
        <button
          type="button"
          onClick={() => onReplayAyah(surahId, ayah)}
          disabled={!canReplay}
          title={canReplay ? undefined : "أوقف الاستماع مؤقتاً للاستماع إلى الآية"}
          className="tby-chip flex-1 h-10 rounded-xl font-readex text-[12px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-45"
        >
          <Icon name="headphones" size={14} />
          استمع للآية
        </button>
      </div>
      {!canReplay && (
        <p className="tby-sheet-muted font-readex text-[10px] mt-1.5 text-center">أوقف الجلسة مؤقتاً لتستمع إلى الآية</p>
      )}
    </div>
  );
}
