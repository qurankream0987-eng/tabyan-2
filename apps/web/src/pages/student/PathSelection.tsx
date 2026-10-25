import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Icon from "@/components/app/Icon";
import { PATH_META } from "@/lib/format";
import { authStore } from "@/lib/auth";

// ── Qiraat inline section ──────────────────────────────────────────
function QiraatInline() {
  return (
    <div className="px-4 pb-4 pt-3 bg-gold/5 border-t border-gold/20 text-center space-y-2">
      <p className="font-readex text-xs text-muted-foreground">
        افتح صفحة القراءات للإجابة عن سؤال الإجازة ورفع الوثيقة عبر المسار المعتمد.
      </p>
      <Link
        to="/student/ijazat"
        className="inline-flex items-center justify-center rounded-xl bg-burgundy px-4 py-2.5 font-readex text-xs font-bold text-white btn-press hover:bg-burgundy/90 transition"
      >
        فتح صفحة القراءات
      </Link>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function PathSelection() {
  const DEMO = authStore.isDemo;
  const { data, isLoading } = trpc.student.paths.useQuery(undefined, { enabled: !DEMO });
  const [quranOpen, setQuranOpen] = useState(false);
  const [qiraatOpen, setQiraatOpen] = useState(false);

  if (!DEMO && (isLoading || !data)) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.5rem]" />)}
    </div>
  );

  const otherPaths = ["tajweed", "sharia"];

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto pb-6">

      {/* Page title */}
      <div className="text-center pt-2 mb-6">
        <h1 className="font-amiri text-4xl font-extrabold text-burgundy mb-2">المسارات التعليمية</h1>
        <p className="font-readex text-sm text-muted-foreground">اختر مسارك وابدأ رحلة الإتقان</p>
      </div>

      {/* ── القرآن الكريم (accordion) ── */}
      <div className={`rounded-3xl overflow-hidden bg-card border transition-all duration-300 ${quranOpen ? "border-burgundy/20 shadow-md ring-1 ring-burgundy/10 dark:ring-gold/10" : "border-transparent shadow-sm"}`}>

        {/* Header — tap to expand */}
        <button
          className="w-full text-right outline-none group"
          onClick={() => { setQuranOpen(v => !v); if (!quranOpen) setQiraatOpen(false); }}
        >
          <div className="p-6 flex items-center gap-4 bg-gradient-to-br from-burgundy/5 to-transparent hover:from-burgundy/10 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-burgundy/15 to-gold/15 flex items-center justify-center text-burgundy shrink-0 transition-transform group-hover:scale-105">
              <Icon name="quran" size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-amiri text-3xl font-extrabold text-burgundy mb-1">القرآن الكريم</div>
              <div className="font-readex text-sm text-muted-foreground font-bold">
                {quranOpen ? "اختر أحد المسارات" : "اضغط لعرض المسارات"}
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-burgundy/5 dark:bg-white/5 text-burgundy shrink-0 transition-transform duration-300 ${quranOpen ? "-rotate-90" : "rotate-0 group-hover:-translate-x-1"}`}>
              <Icon name="arrow-left" size={20} />
            </div>
          </div>
        </button>

        {/* Expanded rows */}
        {quranOpen && (
          <div className="divide-y divide-border border-t border-border animate-in slide-in-from-top-4 duration-300 bg-background/50">

            {/* ١ — حفظ ومراجعة القرآن */}
            <Link to="/student/levels/quran" className="block outline-none group/item">
              <div className="flex items-center gap-4 p-5 hover:bg-burgundy/5 dark:hover:bg-gold/5 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0 group-hover/item:scale-105 transition-transform">
                  <Icon name="quran" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex font-bold text-base text-foreground mb-1">حفظ ومراجعة القرآن</div>
                  <div className="font-readex text-sm text-muted-foreground">٥ مستويات من الغرس إلى الوارثون</div>
                </div>
                <Icon name="arrow-left" size={18} className="text-muted-foreground shrink-0 transition-transform group-hover/item:-translate-x-1" />
              </div>
            </Link>

            {/* ٢ — اختبار القبول */}
            <Link to="/student/placement" className="block outline-none group/item">
              <div className="flex items-center gap-4 p-5 hover:bg-burgundy/5 dark:hover:bg-gold/5 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0 group-hover/item:scale-105 transition-transform">
                  <Icon name="video" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex font-bold text-base text-foreground mb-1 flex items-center gap-2">
                    اختبار القبول
                    <span className="text-[10px] font-extrabold bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">مطلوب</span>
                  </div>
                  <div className="font-readex text-sm text-muted-foreground">سجّل فيديو قصيراً لتحديد مستواك</div>
                </div>
                <Icon name="arrow-left" size={18} className="text-muted-foreground shrink-0 transition-transform group-hover/item:-translate-x-1" />
              </div>
            </Link>

            {/* ٣ — تصحيح التلاوة — متاح لجميع الأعمار */}
            <Link to="/student/tilawah" className="block outline-none group/item">
              <div className="flex items-center gap-4 p-5 hover:bg-burgundy/5 dark:hover:bg-gold/5 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0 group-hover/item:scale-105 transition-transform">
                  <Icon name="mic" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex font-bold text-base text-foreground mb-1">تصحيح التلاوة</div>
                  <div className="font-readex text-sm text-muted-foreground">تحسين التلاوة لجميع الأعمار — بدون حفظ</div>
                </div>
                <Icon name="arrow-left" size={18} className="text-muted-foreground shrink-0 transition-transform group-hover/item:-translate-x-1" />
              </div>
            </Link>

            {/* ٤ — القراءات */}
            <div>
              <button
                className="w-full text-right outline-none group/item"
                onClick={() => setQiraatOpen(v => !v)}
              >
                <div className="flex items-center gap-4 p-5 hover:bg-burgundy/5 dark:hover:bg-gold/5 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gold/15 dark:bg-gold/20 flex items-center justify-center text-gold-dark dark:text-gold shrink-0 group-hover/item:scale-105 transition-transform">
                    <Icon name="certificate" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-readex font-bold text-base text-foreground mb-1">القراءات</div>
                    <div className="font-readex text-sm text-muted-foreground">القراءات العشر — يتطلب إجازة الشاطبية</div>
                  </div>
                  <Icon name={qiraatOpen ? "x" : "shield"} size={18} className="text-gold shrink-0 transition-transform group-hover/item:scale-110" />
                </div>
              </button>

              {/* Inline ijazah flow */}
              {qiraatOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <QiraatInline />
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── باقي المسارات ── */}
      <div className="space-y-4 pt-2">
        {otherPaths.map((key) => {
          const meta = PATH_META[key];
          return (
            <Link key={key} to={`/student/levels/${key}`} className="block group btn-press">
              {/* نفس حاوية بطاقة القرآن الكريم بالضبط — بلا حدود أو خطوط زائدة */}
              <div className="rounded-3xl overflow-hidden bg-card border border-transparent shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="p-6 flex items-center gap-4 bg-gradient-to-br from-burgundy/5 to-transparent group-hover:from-burgundy/10 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-burgundy/15 to-gold/15 flex items-center justify-center text-burgundy shrink-0 transition-transform group-hover:scale-105">
                    <Icon name={meta.icon} size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-amiri text-3xl font-extrabold text-burgundy mb-1">{meta.name}</div>
                    <div className="font-readex text-sm font-bold text-muted-foreground">{meta.desc}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-burgundy/5 dark:bg-white/5 flex items-center justify-center text-burgundy shrink-0 transition-transform group-hover:-translate-x-1">
                    <Icon name="arrow-left" size={20} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
