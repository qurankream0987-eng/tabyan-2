/**
 * إعدادات جلسة تبيان AI الحية — تُفتح من شريط الجلسة دون إيقاف الاستماع.
 * كل مفتاح switch حقيقي (role="switch") ويُحفظ تفضيله محلياً حيث يلزم.
 * الإلغاء دون حفظ يحتاج تأكيداً صريحاً داخل الورقة (بلا window.confirm).
 */
import { useState, type ReactNode } from "react";
import Icon from "@/components/app/Icon";
import ReaderSheet from "./ReaderSheet";

export interface SessionToggle {
  key: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  badge?: string;
  disabled?: boolean;
}

interface Props {
  toggles: SessionToggle[];
  onCancelSession: () => void;
  onClose: () => void;
  busy: boolean;
  footerNote?: ReactNode;
}

export function SwitchRow({ label, description, checked, onChange, badge, disabled }: Omit<SessionToggle, "key">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="tby-option w-full text-right flex items-center gap-3 px-3.5 py-3 btn-press disabled:opacity-45"
    >
      <div className="flex-1 min-w-0">
        <div className="font-readex text-sm font-bold leading-tight flex items-center gap-2">
          {label}
          {badge && (
            <span className="tby-chip rounded-full px-2 py-0.5 text-[10px] font-bold leading-none">{badge}</span>
          )}
        </div>
        <div className="tby-sheet-muted font-readex text-[11px] mt-1 leading-snug">{description}</div>
      </div>
      <span
        aria-hidden
        className="relative w-11 h-6 rounded-full shrink-0 transition-colors"
        style={{ background: checked ? "var(--mushaf-primary)" : "color-mix(in srgb, var(--mushaf-chrome-fg) 16%, transparent)" }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full shadow transition-all"
          style={{ background: checked ? "var(--mushaf-on-primary)" : "var(--mushaf-chrome-solid)", right: checked ? 4 : 24 }}
        />
      </span>
    </button>
  );
}

export default function RecitationSessionSettingsSheet({ toggles, onCancelSession, onClose, busy, footerNote }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  return (
    <ReaderSheet title="إعدادات الجلسة" subtitle="تُطبَّق فوراً دون إيقاف الاستماع" onClose={onClose}>
      <div className="space-y-2 pt-1">
        {toggles.map(({ key, ...toggle }) => <SwitchRow key={key} {...toggle} />)}
      </div>
      {footerNote && <div className="tby-sheet-muted font-readex text-[11px] leading-relaxed mt-3">{footerNote}</div>}

      <div className="mt-5 pt-4 border-t border-[var(--mushaf-chrome-border)]">
        {confirmCancel ? (
          <div className="tby-sheet-card p-3 space-y-3" role="alertdialog" aria-label="تأكيد إلغاء الجلسة">
            <p className="font-readex text-sm font-bold">إلغاء الجلسة دون حفظ؟</p>
            <p className="tby-sheet-muted font-readex text-[11px]">لن تُحفظ مدة الجلسة ولا ملخصها.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="tby-chip flex-1 h-11 rounded-xl font-readex text-sm font-bold"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => { onClose(); onCancelSession(); }}
                className="flex-1 h-11 rounded-xl font-readex text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "var(--mushaf-error)" }}
              >
                نعم، ألغِ الجلسة
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={busy}
            className="w-full h-11 rounded-xl inline-flex items-center justify-center gap-2 font-readex text-sm font-bold disabled:opacity-50"
            style={{ color: "var(--mushaf-error)" }}
          >
            <Icon name="x-circle" size={16} />
            إلغاء الجلسة دون حفظ
          </button>
        )}
      </div>
    </ReaderSheet>
  );
}
