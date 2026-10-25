/**
 * @license
 * Tabyan Smart Mushaf — Reader Settings Modal
 * The Madani page layout is fixed by the printed Mushaf, so there are no font
 * or reflow settings; text size follows the device (pinch / browser zoom).
 */

import React from 'react';
import { X, Sliders, Moon, Highlighter, ScrollText } from 'lucide-react';
import type { ReaderPreferences } from '../../reader/readerPreferences';

interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly preferences: ReaderPreferences;
  readonly onUpdate: (updated: Partial<ReaderPreferences>) => void;
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span className="flex items-start gap-2">
        <span className="mt-0.5 text-[#C5A059]">{icon}</span>
        <span>
          <span className="block text-sm font-bold text-[#4A0E17] dark:text-[#E5C378]">{label}</span>
          <span className="block text-xs leading-5 text-[#6B1D2F]/80 dark:text-[#EAD8C7]/75">{description}</span>
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-5 h-5 shrink-0 accent-[#4A0E17] dark:accent-[#C5A059]"
      />
    </label>
  );
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, preferences, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#FAF6EE] dark:bg-[#1D1417] border border-[#C5A059]/40 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C5A059]/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#C5A059]" />
            <h3 className="text-base font-bold text-[#4A0E17] dark:text-[#E5C378]">إعدادات المصحف</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="divide-y divide-[#C5A059]/20">
            <ToggleRow
              icon={<Moon className="w-4 h-4" />}
              label="الوضع الليلي"
              description="ورق داكن وحبر فاتح للقراءة في الإضاءة الخافتة"
              checked={preferences.darkMode}
              onChange={(darkMode) => onUpdate({ darkMode })}
            />
            <ToggleRow
              icon={<Highlighter className="w-4 h-4" />}
              label="تلوين الكلمات المقروءة"
              description="تمييز ما قرأته بلون هادئ أثناء المتابعة"
              checked={preferences.showRecitedWords}
              onChange={(showRecitedWords) => onUpdate({ showRecitedWords })}
            />
            <ToggleRow
              icon={<ScrollText className="w-4 h-4" />}
              label="المتابعة التلقائية"
              description="إبقاء سطر التلاوة في مجال الرؤية دون ملاحقة كل كلمة"
              checked={preferences.autoFollow}
              onChange={(autoFollow) => onUpdate({ autoFollow })}
            />
          </div>

          <p className="text-xs leading-6 text-[#6B1D2F]/80 dark:text-[#EAD8C7]/75">
            صفحات المصحف بترتيب الطبعة المدنية (٦٠٤ صفحة)؛ لتكبير النص استخدم تكبير الشاشة في جهازك.
          </p>

          <section
            aria-label="مصدر النص القرآني"
            data-testid="tanzil-attribution"
            className="border-t border-[#C5A059]/30 pt-4 text-xs leading-6 text-[#6B1D2F] dark:text-[#EAD8C7]"
          >
            <p className="font-bold text-[#4A0E17] dark:text-[#E5C378]">مصدر النص القرآني</p>
            <p>النص العثماني من مشروع تنزيل (Tanzil Project)، منقول كما هو دون تغيير.</p>
            <p>الترخيص: Creative Commons Attribution 3.0 (CC BY 3.0).</p>
            <div className="flex flex-wrap gap-x-4">
              <a
                href="https://tanzil.net/"
                target="_blank"
                rel="noreferrer"
                data-testid="link-tanzil-source"
                className="underline underline-offset-2 hover:text-[#C5A059]"
              >
                المصدر والتحديثات: tanzil.net
              </a>
              <a
                href="https://tanzil.net/docs/Text_License"
                target="_blank"
                rel="noreferrer"
                data-testid="link-tanzil-license"
                className="underline underline-offset-2 hover:text-[#C5A059]"
              >
                نص الترخيص
              </a>
            </div>
            <p className="mt-2">رسم الصفحات بخطوط مجمع الملك فهد لطباعة المصحف الشريف (QCF v2).</p>
          </section>
        </div>
      </div>
    </div>
  );
};
