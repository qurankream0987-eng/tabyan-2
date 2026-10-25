/**
 * أدوات الحفظ والمراجعة — قائمة هادئة من الشريط العائم (زر «أدوات»).
 * كل عنصر يعمل فعلاً؛ الأدوات غير المتاحة تُعرض معطّلة مع السبب بدل إخفاء صامت.
 */
import Icon, { type IconName } from "@/components/app/Icon";
import ReaderSheet from "./ReaderSheet";

export interface ReaderTool {
  key: string;
  icon: IconName;
  label: string;
  description: string;
  onSelect: () => void;
  disabledReason?: string | null;
}

export default function ReaderToolsSheet({ tools, onClose }: { tools: ReaderTool[]; onClose: () => void }) {
  return (
    <ReaderSheet title="أدوات الحفظ والمراجعة" subtitle="مراجعة وردك وسجل تلاوتك" onClose={onClose}>
      {tools.length === 0 && (
        <div className="tby-reader-empty" role="status">
          <Icon name="clock" size={24} className="tby-index-empty-icon" />
          <p className="tby-sheet-muted font-readex text-sm">لا أدوات متاحة الآن.</p>
        </div>
      )}
      <ul className="space-y-1.5 pt-1">
        {tools.map((tool) => (
          <li key={tool.key}>
            <button
              type="button"
              disabled={!!tool.disabledReason}
              onClick={() => { onClose(); tool.onSelect(); }}
              aria-describedby={`tool-desc-${tool.key}`}
              data-testid={`reader-tool-${tool.key}`}
              className="tby-sheet-card tby-tool-row w-full px-3.5 py-3 flex items-center gap-3 text-right"
            >
              <span aria-hidden="true" className="tby-ayah-action-icon w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <Icon name={tool.icon} size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-readex text-sm font-bold">{tool.label}</span>
                <span id={`tool-desc-${tool.key}`} className={`${tool.disabledReason ? "tby-tool-reason" : "tby-sheet-muted"} block font-readex text-[11px] mt-0.5 leading-snug`}>
                  {tool.disabledReason ?? tool.description}
                </span>
              </span>
              {!tool.disabledReason && <Icon name="chevron-left" size={16} className="tby-sheet-muted shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </ReaderSheet>
  );
}
