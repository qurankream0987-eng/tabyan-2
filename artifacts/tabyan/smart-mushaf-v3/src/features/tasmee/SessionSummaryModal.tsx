/**
 * @license
 * Tabyan Smart Mushaf — Tasmee Session Result Summary Modal
 */

import React from 'react';
import { SessionResultSummary } from '../../smart/state/types';
import { Award, CheckCircle, AlertTriangle, Clock, RotateCcw, X } from 'lucide-react';

interface SessionSummaryModalProps {
  readonly summary: SessionResultSummary | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onRestart: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  summary,
  isOpen,
  onClose,
  onRestart,
}) => {
  if (!isOpen || !summary) return null;

  const { metrics, mistakes } = summary;
  const minutes = Math.floor(metrics.durationSeconds / 60);
  const seconds = metrics.durationSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-md bg-[#FAF6EE] dark:bg-[#1D1417] border border-[#C5A059]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 text-center border-b border-[#C5A059]/30 bg-gradient-to-b from-[#F7F3E9] to-[#FAF6EE] dark:from-[#25191D] dark:to-[#1D1417]">
          <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-full bg-[#C5A059]/20 text-[#4A0E17] dark:text-[#E5C378] border border-[#C5A059]/40">
            <Award className="w-7 h-7 text-[#C5A059]" />
          </div>
          <h3 className="text-xl font-bold font-['Amiri_Quran',serif] text-[#4A0E17] dark:text-[#E5C378]">
            تقرير جلسة التسميع
          </h3>
          <p className="text-xs text-[#6B1D2F]/70 dark:text-[#C5A059]/70 mt-1 font-sans">
            سورة رقم {summary.targetScope.surahNumber}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 text-center">
              <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-sans block mb-1">
                نسبة الإتقان
              </span>
              <span className="text-2xl font-bold text-[#4A0E17] dark:text-[#E5C378] font-sans">
                {metrics.accuracyPercentage}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 text-center">
              <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-sans block mb-1">
                مدة التسميع
              </span>
              <span className="text-2xl font-bold text-[#4A0E17] dark:text-[#E5C378] font-sans">
                {minutes > 0 ? `${minutes}د ` : ''}{seconds}ث
              </span>
            </div>

            <div className="p-3 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 text-center">
              <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-sans block mb-1">
                الكلمات المؤكدة
              </span>
              <span className="text-xl font-bold text-[#4A0E17] dark:text-[#E5C378] font-sans">
                {metrics.confirmedWordsCount}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 text-center">
              <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-sans block mb-1">
                المكشوفة (تلميح)
              </span>
              <span className="text-xl font-bold text-[#832238] dark:text-[#E5C378] font-sans">
                {metrics.revealedWordsCount || 0}
              </span>
            </div>

            <div className="col-span-2 p-2.5 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 text-center">
              <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-sans block mb-0.5">
                الكلمات المتخطاة
              </span>
              <span className="text-lg font-bold text-[#B07D1E] dark:text-[#E0A96D] font-sans">
                {metrics.skippedWordsCount}
              </span>
            </div>
          </div>

          {/* Mistakes notes if any */}
          {mistakes.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold text-[#4A0E17] dark:text-[#E5C378] block mb-2 font-sans">
                ملاحظات التلاوة ({mistakes.length}):
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                {mistakes.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 text-right">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#4A0E17] dark:text-[#E5C378]">
                        الآية {m.key.ayah} (كلمة {m.key.wordIndex}):
                      </span>{' '}
                      <span className="text-[#2C1E22] dark:text-[#EAD8C7]">{m.messageAr}</span>
                      {m.ruleName && <span className="text-[#6B1D2F]/70 mr-1">({m.ruleName})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#F0EAE1]/70 dark:bg-[#25191D]/70 border-t border-[#C5A059]/20 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onRestart();
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#4A0E17] dark:text-[#E5C378] bg-white dark:bg-[#342227] border border-[#C5A059]/30 rounded-xl hover:border-[#C5A059] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة التسميع</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#4A0E17] dark:bg-[#C5A059] dark:text-[#1D1417] rounded-xl hover:opacity-90 transition-opacity"
          >
            متابعة القراءة
          </button>
        </div>
      </div>
    </div>
  );
};
