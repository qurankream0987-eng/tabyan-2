/**
 * RecitationSessionBar — كبسولة جلسة تبيان AI المضغوطة.
 *
 * تجلس بين الأداة السياقية (يسار) والزر الرئيسي (يمين) في الصف السفلي نفسه؛
 * لا لوحة طويلة ولا إزاحة للمصحف. الإيقاف المؤقت/الاستئناف على الزر الرئيسي
 * (onPause/onResume يمرَّران إليه من القارئ)، وهنا: الحالة · الزمن · تنقل التعليمي ·
 * تلميح · إعدادات الجلسة · إنهاء. الفشل شارة صغيرة تفتح ورقة «حاول مرة أخرى / إغلاق».
 */
import Icon from "@/components/app/Icon";
import { formatDuration, toArabicNum } from "@/lib/recitation-types";
import type { RecitationRange } from "@/lib/mushaf/useRecitationSession";
import { presentAiPhase, type AiPhase } from "@/lib/recitation-ai/aiSessionPhase";
import AiStatusChip from "./AiStatusChip";

export type SessionKindLabel = "تلاوة" | "حفظ" | "اختبار الحفظ" | "متابعة قارئ" | "تسميع تعليمي" | "تسميع";

interface Props {
  kindLabel: SessionKindLabel;
  aiPhase: AiPhase;
  aiAvailable: boolean;
  elapsedSecs: number;
  busy: boolean;
  sessionError: string | null;
  qualityMessage: string | null;
  canPeek: boolean;
  educational?: { range: RecitationRange; currentAyah: number | null; onPrev: () => void; onNext: () => void } | null;
  positionLabel: string | null;
  strictHold: boolean;
  onPeek: () => void;
  /** يُستعمل على الزر الرئيسي */
  onPause: () => void;
  /** يُستعمل على الزر الرئيسي */
  onResume: () => void;
  onEnd: () => void;
  onRetryAi: () => void;
  onOpenSettings: () => void;
  onClearError: () => void;
}

export default function RecitationSessionBar({
  kindLabel, aiPhase, aiAvailable, elapsedSecs, busy, sessionError, qualityMessage, canPeek,
  educational, positionLabel, strictHold,
  onPeek, onEnd, onRetryAi, onOpenSettings, onClearError,
}: Props) {
  const isPaused = aiPhase === "PAUSED";
  const presentation = presentAiPhase(aiPhase);
  const processing = aiPhase === "PROCESSING";
  const statusLabel = processing
    ? "يحلّل…"
    : aiAvailable ? presentation.label : (isPaused ? "متوقف مؤقتاً" : "تسميع يدوي");
  const dot = aiAvailable ? presentation.dot : (isPaused ? "paused" : "listening");
  const failed = !!sessionError || (aiAvailable && presentation.canRetry);

  const canPrev = !!educational && !busy && educational.currentAyah !== null && educational.currentAyah > educational.range.startAyah;
  const canNext = !!educational && !busy && educational.currentAyah !== null && educational.currentAyah < educational.range.endAyah;

  return (
    <div className="tby-session-pill-wrap" dir="rtl" role="region" aria-label={`جلسة ${kindLabel}`}>
      {(strictHold || qualityMessage) && !failed && (
        <p className="tby-session-hint" role="status" aria-live="polite">
          {strictHold ? "أعد الكلمة المعلَّمة صحيحةً لتتابع" : qualityMessage}
        </p>
      )}
      <div className="tby-session-pill" data-testid="mushaf-session-pill">
        {failed ? (
          <AiStatusChip
            kind="error"
            label={presentation.label}
            message={sessionError ?? "تعذّر الاتصال بخدمة الاستماع. نصك ظاهر ويمكنك المتابعة أو إعادة المحاولة."}
            onRetry={aiAvailable && presentation.canRetry && !busy ? onRetryAi : null}
            onDismiss={sessionError ? onClearError : null}
          />
        ) : (
          <span
            className="tby-session-status"
            aria-live="polite"
            title={`${kindLabel}${positionLabel ? ` · ${positionLabel}` : ""}`}
          >
            <span className="tby-mic-dot" data-kind={dot} aria-hidden />
            <span className="tby-session-status-label">{statusLabel}</span>
            <span className="tby-session-time tabular-nums">{busy ? "…" : formatDuration(elapsedSecs)}</span>
          </span>
        )}

        {educational && (
          <>
            <button type="button" onClick={educational.onPrev} disabled={!canPrev || isPaused} className="tby-pill-btn" aria-label="الآية السابقة">
              <Icon name="chevron-right" size={16} />
            </button>
            <span className="tby-session-time tabular-nums">
              {educational.currentAyah !== null ? `${toArabicNum(educational.currentAyah)}/${toArabicNum(educational.range.endAyah)}` : ""}
            </span>
            <button type="button" onClick={educational.onNext} disabled={!canNext || isPaused} className="tby-pill-btn" aria-label="الآية التالية">
              <Icon name="chevron-left" size={16} />
            </button>
          </>
        )}

        {canPeek && !isPaused && (
          <button
            type="button"
            onClick={onPeek}
            disabled={busy}
            className="tby-pill-btn"
            aria-label="تلميح: اضغط مرة لكلمة، ومرتين لعدة كلمات، وثلاثاً لبقية الآية"
            data-testid="mushaf-session-peek"
          >
            <Icon name="eye" size={17} />
          </button>
        )}

        <button type="button" onClick={onOpenSettings} disabled={busy} className="tby-pill-btn" aria-label="إعدادات الجلسة" data-testid="mushaf-session-settings">
          <Icon name="settings" size={17} />
        </button>

        <button
          type="button"
          onClick={onEnd}
          disabled={busy || processing}
          aria-label={processing ? "جارٍ تحليل التلاوة" : "إنهاء الجلسة"}
          aria-busy={processing || busy}
          className="tby-pill-btn tby-pill-btn--end"
          data-testid="mushaf-session-end"
        >
          {busy || processing
            ? <span className="tby-fab-spinner tby-fab-spinner--sm" aria-hidden="true" />
            : <Icon name="stop" size={14} />}
        </button>
      </div>
    </div>
  );
}
