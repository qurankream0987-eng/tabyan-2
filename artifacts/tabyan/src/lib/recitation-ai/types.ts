/**
 * جاهزية Tabyan AI — واجهات فقط، بلا أي مزود فعلي (§33–36).
 *
 * الحالة الرسمية: PROVIDER EVALUATION — لم يُعتمد مزود Speech Recognition بعد.
 * ممنوع هنا: أي تنفيذ فعلي، أي Web Speech API، أي Mock يتظاهر بالتعرف.
 * عند اعتماد المزود، يُكتب Adapter يحقق SpeechRecognitionProvider دون تغيير
 * أي كود في MushafReader/RecitationLayer.
 */

/** حالات الكلمة في طبقة التسميع — تُفعَّل لاحقاً عند ربط المزود (§36) */
export type WordState =
  | "hidden"     // مخفية (وضع إخفاء)
  | "revealed"   // كُشفت (يدوياً الآن، صوتياً لاحقاً)
  | "current"    // الكلمة الجارية أثناء التسميع الصوتي
  | "correct"    // نُطقت صحيحة
  | "uncertain"  // التعرف غير حاسم
  | "mistake";   // خطأ (حذف/إبدال/تخطٍ)

/** نتيجة جزئية أو نهائية من مزود التعرف الصوتي */
export interface TranscriptEvent {
  /** النص كما أعاده المزود (خام — قبل أي Normalization) */
  text: string;
  /** نهائي أم جزئي (partial) */
  isFinal: boolean;
  /** ثقة المزود 0..1 إن توفرت */
  confidence?: number;
  /** طوابع كلمات إن وفرها المزود (ms من بداية الجلسة) */
  words?: { text: string; startMs?: number; endMs?: number; confidence?: number }[];
  /** زمن استلام الحدث (لقياس الكمون) */
  receivedAt: number;
  /** معرّف حدث المزود؛ يمنع إعادة معالجة delta/final نفسها */
  itemId: string;
  /** زمن استلام الحدث داخل المتصفح، للاستخدام في قياس الكمون فقط */
  clientReceivedAt?: number;
  /** آخر زمن أُرسل فيه audio chunk داخل المتصفح */
  audioChunkSentAt?: number;
}

/** الاسم المحايد لحدث يصل إلى أي مزود ASR، مستقل عن OpenAI. */
export type CanonicalTranscriptEvent = TranscriptEvent;

/** أرقام Canary محلية؛ لا تحتوي صوتاً أو نصّاً خاماً. */
export interface LiveRevealLatencyMetrics {
  matcherP50Ms: number | null;
  matcherP95Ms: number | null;
  matcherMaxMs: number | null;
  renderP50Ms: number | null;
  renderP95Ms: number | null;
  visualCompletionP50Ms: number | null;
  totalP50Ms: number | null;
  totalP95Ms: number | null;
}

/** واجهة مزود التعرف الصوتي — العقد الوحيد الذي سيُبنى عليه الـ Adapter (§35) */
export interface SpeechRecognitionProvider {
  /** بدء الالتقاط والبث */
  start(opts: { language: "ar"; sessionId: string }): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  /** اشتراك في نتائج جزئية/نهائية */
  onTranscript(cb: (e: TranscriptEvent) => void): void;
  onError(cb: (err: { code: string; message: string; fatal: boolean }) => void): void;
  /** كمون آخر رحلة (ms) إن قابلاً للقياس */
  readonly lastLatencyMs: number | null;
}

/** موضع كلمة قرآنية في المصحف (مطابق لبيانات QCF الحالية) */
export interface QuranWordRef {
  verseKey: string;   // "سورة:آية"
  position: number;   // ترتيب الكلمة داخل الآية (type=0 فقط)
}

/**
 * مطابقة التلاوة بالنص القرآني — يستهلك TranscriptEvents ويُخرج تقدم الكلمات.
 * التنفيذ لاحقاً بعد اختيار المزود؛ الدقة النصية أولاً — لا تقييم تجويد (§39).
 */
export interface RecitationMatcher {
  /** تهيئة بنطاق التسميع (بترتيب كلمات المصحف الحقيقي) */
  init(range: { words: QuranWordRef[] }): void;
  /** تغذية حدث تعرف — يُعيد تحديثات حالة الكلمات المتأثرة فقط (targeted — §57) */
  feed(e: TranscriptEvent): { word: QuranWordRef; state: WordState }[];
  /** الكلمة الجارية الحالية إن وُجدت */
  readonly current: QuranWordRef | null;
}

/** أنواع الأخطاء النصية المعتمدة (خارطة §38) */
export type MistakeKind = "missing_word" | "substitution" | "skip_ayah" | "repetition";

export interface RecitationMistake {
  kind: MistakeKind;
  at: QuranWordRef;
  /** ما سُمع فعلاً إن توفر (بعد Normalization) */
  heard?: string;
}

/** كاشف الأخطاء — يعمل فوق مخرجات الـ Matcher، بلا أي تقدير وهمي (§32) */
export interface MistakeDetector {
  observe(update: { word: QuranWordRef; state: WordState }): RecitationMistake | null;
  readonly all: readonly RecitationMistake[];
}
