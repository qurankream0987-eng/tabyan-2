/**
 * سجل التلاوة المحلي (Part 28–29) — على هذا الجهاز ولكل مستخدم على حدة.
 *
 * لماذا محلي؟ جدول recitation_sessions على الخادم يحفظ بيانات الجلسة فقط (المدة،
 * النطاق، الحالة) ولا يوجد نموذج بيانات للأخطاء على مستوى الكلمة. أي حفظ خادمي
 * يحتاج Migration إضافية؛ مقترحها موثّق في تقرير الترقية ولم يُطبّق تلقائياً.
 * السجل هنا يرتبط بمعرّف جلسة الخادم (serverSessionId) حين يوجد.
 *
 * الخصوصية: لا صوت، ولا نص تفريغ، ولا اللفظ المسموع — مواضع كنسية وأعداد فقط.
 * "ليست خطأ" يعيد تصنيف الخطأ (dismissed) ولا يحذفه بصمت.
 */
import type { RecitationMistakeKind } from "./recitationStateEngine";

export const HISTORY_VERSION = 1;
const MAX_SESSIONS = 200;
const MAX_MISTAKES = 3_000;

export type HistoryMode = "tilawa" | "hifz" | "test" | "follow";

export const HISTORY_MODE_LABEL: Record<HistoryMode, string> = {
  tilawa: "تلاوة",
  hifz: "حفظ",
  test: "اختبار الحفظ",
  follow: "متابعة قارئ",
};

export interface HistorySession {
  id: string;
  serverSessionId?: string;
  at: number;
  durationSec: number;
  mode: HistoryMode;
  scopeLabel: string;
  /** أول/آخر آية مسموعة (للانتقال والمراجعة) */
  firstVerseKey: string | null;
  lastVerseKey: string | null;
  words: number;
  confirmed: number;
  corrected: number;
  peeks: number;
  accuracy: number | null;
  /** اختبار الحفظ فقط */
  testScore?: number | null;
}

export type MistakeStatus = "confirmed" | "corrected" | "dismissed";

export interface HistoryMistake {
  id: string;
  sessionId: string;
  at: number;
  verseKey: string;
  position: number;
  kind: RecitationMistakeKind;
  status: MistakeStatus;
  /** الحالة قبل "ليست خطأ" — للتدقيق */
  previousStatus?: Exclude<MistakeStatus, "dismissed">;
  reclassifiedAt?: number;
}

/** تجميع لكل آية يغذّي محرك الضعف. */
export interface AyahStat {
  verseKey: string;
  correctWords: number;
  mistakes: number;
  corrected: number;
  peeks: number;
  successfulReviews: number;
  failedReviews: number;
  lastReviewedAt: number;
}

export interface HistoryData {
  version: number;
  sessions: HistorySession[];
  mistakes: HistoryMistake[];
  ayahs: Record<string, AyahStat>;
}

export interface AyahSessionResult {
  verseKey: string;
  correctWords: number;
  confirmed: number;
  corrected: number;
  peeks: number;
  /** تقييم ذاتي صريح (اختبار دون AI): يحدد نتيجة المراجعة دون اختلاق أخطاء كلمات */
  selfReported?: "success" | "failed";
}

export interface RecordSessionInput {
  session: Omit<HistorySession, "id">;
  mistakes: Omit<HistoryMistake, "id" | "sessionId" | "at">[];
  ayahs: AyahSessionResult[];
}

const EMPTY: HistoryData = { version: HISTORY_VERSION, sessions: [], mistakes: [], ayahs: {} };

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** مراجعة ناجحة = لا خطأ مؤكد ولا تلميح في الآية؛ فاشلة = خطأ مؤكد. */
function reviewOutcome(result: AyahSessionResult): "success" | "failed" | "neutral" {
  if (result.selfReported) return result.selfReported;
  if (result.confirmed > 0) return "failed";
  if (result.peeks > 0) return "neutral";
  return result.correctWords > 0 ? "success" : "neutral";
}

export class RecitationHistoryStore {
  constructor(private readonly userKey: string, private readonly storage: KeyValueStorage | null = safeLocalStorage()) {}

  private get key() {
    return `tabyan.recitation.history.v${HISTORY_VERSION}:${this.userKey}`;
  }

  load(): HistoryData {
    if (!this.storage) return structuredClone(EMPTY);
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return structuredClone(EMPTY);
      const data = JSON.parse(raw) as HistoryData;
      if (data.version !== HISTORY_VERSION || !Array.isArray(data.sessions)) return structuredClone(EMPTY);
      return data;
    } catch {
      return structuredClone(EMPTY);
    }
  }

  private save(data: HistoryData) {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
    } catch {
      // الامتلاء: نتخلص من أقدم نصف السجل ونعيد المحاولة مرة واحدة.
      try {
        data.sessions = data.sessions.slice(-Math.floor(MAX_SESSIONS / 2));
        const keep = new Set(data.sessions.map((s) => s.id));
        data.mistakes = data.mistakes.filter((m) => keep.has(m.sessionId));
        this.storage.setItem(this.key, JSON.stringify(data));
      } catch { /* يبقى السجل للجلسة الحالية فقط */ }
    }
  }

  record(input: RecordSessionInput): HistorySession {
    const data = this.load();
    const session: HistorySession = { ...input.session, id: uid() };
    data.sessions.push(session);
    for (const mistake of input.mistakes) {
      data.mistakes.push({ ...mistake, id: uid(), sessionId: session.id, at: session.at });
    }
    for (const result of input.ayahs) {
      const stat = data.ayahs[result.verseKey] ?? {
        verseKey: result.verseKey, correctWords: 0, mistakes: 0, corrected: 0, peeks: 0,
        successfulReviews: 0, failedReviews: 0, lastReviewedAt: 0,
      };
      stat.correctWords += result.correctWords;
      stat.mistakes += result.confirmed;
      stat.corrected += result.corrected;
      stat.peeks += result.peeks;
      const outcome = reviewOutcome(result);
      if (outcome === "success") stat.successfulReviews += 1;
      if (outcome === "failed") stat.failedReviews += 1;
      stat.lastReviewedAt = Math.max(stat.lastReviewedAt, session.at);
      data.ayahs[result.verseKey] = stat;
    }
    if (data.sessions.length > MAX_SESSIONS) data.sessions.splice(0, data.sessions.length - MAX_SESSIONS);
    if (data.mistakes.length > MAX_MISTAKES) data.mistakes.splice(0, data.mistakes.length - MAX_MISTAKES);
    this.save(data);
    return session;
  }

  /**
   * "ليست خطأ": يعيد التصنيف إلى dismissed ويحفظ الحالة السابقة، ويصحح
   * تجميع الآية (خطأ مؤكد أقل). لا حذف.
   */
  markNotMistake(mistakeId: string, now = Date.now()): boolean {
    const data = this.load();
    const mistake = data.mistakes.find((m) => m.id === mistakeId);
    if (!mistake || mistake.status === "dismissed") return false;
    const stat = data.ayahs[mistake.verseKey];
    if (stat) {
      if (mistake.status === "confirmed") stat.mistakes = Math.max(0, stat.mistakes - 1);
      if (mistake.status === "corrected") stat.corrected = Math.max(0, stat.corrected - 1);
    }
    mistake.previousStatus = mistake.status;
    mistake.status = "dismissed";
    mistake.reclassifiedAt = now;
    this.save(data);
    return true;
  }

  clear() {
    try { this.storage?.removeItem(this.key); } catch { /* تجاهل */ }
  }
}

function safeLocalStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** مرشحات عرض سجل الأخطاء (Part 29). */
export function filterMistakes(
  data: HistoryData,
  filter: { sessionId?: string; surah?: number; verseKey?: string; status?: MistakeStatus | "all" },
): HistoryMistake[] {
  return data.mistakes.filter((m) => {
    if (filter.sessionId && m.sessionId !== filter.sessionId) return false;
    if (filter.verseKey && m.verseKey !== filter.verseKey) return false;
    if (filter.surah && Number(m.verseKey.split(":")[0]) !== filter.surah) return false;
    if (filter.status && filter.status !== "all" && m.status !== filter.status) return false;
    return true;
  }).sort((a, b) => b.at - a.at);
}

/** تجميع الأخطاء (غير المرفوضة) حسب السورة ثم الآية. */
export function mistakesBySurah(data: HistoryData): { surah: number; count: number; ayahs: { verseKey: string; count: number }[] }[] {
  const surahs = new Map<number, Map<string, number>>();
  for (const m of data.mistakes) {
    if (m.status === "dismissed") continue;
    const surah = Number(m.verseKey.split(":")[0]);
    const ayahs = surahs.get(surah) ?? new Map<string, number>();
    ayahs.set(m.verseKey, (ayahs.get(m.verseKey) ?? 0) + 1);
    surahs.set(surah, ayahs);
  }
  return [...surahs.entries()]
    .map(([surah, ayahs]) => ({
      surah,
      count: [...ayahs.values()].reduce((a, b) => a + b, 0),
      ayahs: [...ayahs.entries()].map(([verseKey, count]) => ({ verseKey, count }))
        .sort((a, b) => Number(a.verseKey.split(":")[1]) - Number(b.verseKey.split(":")[1])),
    }))
    .sort((a, b) => a.surah - b.surah);
}
