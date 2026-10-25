/** Extracted real production toolbar; isolated public metadata, no API or auth. */
import { useState } from "react";
import Controls from "./_Controls";
import "./_group.css";

export function Current() {
  const [bookmarked, setBookmarked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [markers, setMarkers] = useState(false);
  const [notice, setNotice] = useState("مرجع أدوات المصحف الحالية — دون جلسة أو بيانات حساب");
  const notify = (text: string) => () => setNotice(text);
  return (
    <div className="tby-reader fixed inset-0 flex flex-col" data-mode="read" data-fit="aspect" dir="rtl">
      <Controls
        page={1} surahName="الفاتحة" surahNumber={1} juz={1}
        bookmarked={bookmarked} zoom={zoom} visible sessionActive={false}
        globalHideMode="visible_review" hideMarkers={markers}
        onMenuOpenChange={() => undefined}
        onClose={notify("معاينة فقط — لا توجد جلسة مصحف مفتوحة")}
        onToggleBookmark={() => setBookmarked(v => !v)}
        onZoomIn={() => setZoom(v => Math.min(3, v + .25))}
        onZoomOut={() => setZoom(v => Math.max(1, v - .25))}
        onZoomReset={() => setZoom(1)}
        onOpenIndex={notify("فتح الفهرس مرتبط في التطبيق؛ هذه معاينة شريط الأدوات فقط")}
        onOpenSearch={notify("فتح البحث مرتبط في التطبيق؛ هذه معاينة شريط الأدوات فقط")}
        onOpenHide={notify("إعداد الإخفاء مرتبط في التطبيق")}
        onOpenTools={notify("أدوات الحفظ مرتبطة في التطبيق")}
        onToggleHideMarkers={() => setMarkers(v => !v)}
        onRevealGlobalWord={notify("لا كلمات أو جلسة تسميع في هذه المعاينة")}
        onOpenListening={notify("مشغّل الاستماع مرتبط في التطبيق")}
      />
      <p role="status" style={{ margin: "auto 24px 32px", textAlign: "center", color: "var(--mushaf-text-muted)", fontSize: 13 }}>
        {notice}
      </p>
    </div>
  );
}
