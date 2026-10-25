/**
 * @license
 * Tabyan Smart Mushaf — learner-facing session copy (Arabic)
 * The only source of status text shown to the learner. Technical errors are
 * classified into reasons upstream; raw provider/browser messages never reach
 * this layer.
 */

import type { LiveSessionErrorReason, LiveSessionPhase } from './sessionMachine';

export interface SessionStatusCopy {
  readonly title: string;
  readonly hint: string | null;
  readonly tone: 'idle' | 'busy' | 'live' | 'paused' | 'warning' | 'error';
}

const ERROR_COPY: Readonly<Record<LiveSessionErrorReason, SessionStatusCopy>> = Object.freeze({
  'mic-denied': {
    title: 'تعذر الوصول للميكروفون',
    hint: 'اسمح باستخدام الميكروفون من إعدادات المتصفح ثم حاول مجددًا',
    tone: 'error',
  },
  'mic-unavailable': {
    title: 'تعذر الوصول للميكروفون',
    hint: 'تأكد من توصيل الميكروفون وأنه غير مستخدم في تطبيق آخر',
    tone: 'error',
  },
  'provider-unavailable': {
    title: 'تعذر الاتصال بخدمة التسميع',
    hint: 'تحقق من الاتصال بالإنترنت ثم حاول مجددًا',
    tone: 'error',
  },
  'provider-auth': {
    title: 'سجّل الدخول لاستخدام التسميع',
    hint: null,
    tone: 'error',
  },
  unknown: {
    title: 'تعذر بدء التسميع',
    hint: 'حاول مجددًا بعد قليل',
    tone: 'error',
  },
});

export function sessionStatusCopy(phase: LiveSessionPhase, error: LiveSessionErrorReason | null): SessionStatusCopy {
  switch (phase) {
    case 'IDLE':
      return { title: 'اضغط للبدء ثم اقرأ', hint: null, tone: 'idle' };
    case 'REQUESTING_MIC':
      return { title: 'جارٍ تجهيز الميكروفون', hint: null, tone: 'busy' };
    case 'LISTENING':
    case 'VOICE_ACTIVE':
    case 'TRACKING':
      return { title: 'أستمع الآن', hint: null, tone: 'live' };
    case 'PAUSED':
      return { title: 'توقفت مؤقتًا', hint: 'اضغط للمتابعة من الموضع نفسه', tone: 'paused' };
    case 'RECOVERING':
      return { title: 'ضعف الاتصال', hint: 'تابع التلاوة، نعيد الاتصال تلقائيًا', tone: 'warning' };
    case 'ERROR':
      return ERROR_COPY[error ?? 'unknown'];
  }
}
