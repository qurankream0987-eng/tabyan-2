import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";

const FAQS = [
  {
    q: "كيف أحجز حصة؟",
    a: "من الصفحة الرئيسية افتح قسم «حلقاتي» ثم اضغط «عرض المواعيد المتاحة»، اختر المعلم والوقت المناسب وأكّد الحجز — سيصلك إشعار بالموعد.",
  },
  {
    q: "كيف أطلب ترقية؟",
    a: "بعد إتمام متطلبات مستواك الحالي، افتح «الفئات» من الرئيسية وادخل مسارك، ثم أرسل طلب الترقية من صفحة المستويات وستراجعه اللجنة.",
  },
  {
    q: "أين تسجيلاتي؟",
    a: "كل حلقاتك المسجلة محفوظة في صفحة «تسجيلاتي» — يمكنك إعادة مشاهدتها ومراجعة تقييمك في أي وقت.",
  },
  {
    q: "كيف أرسل فتوى؟",
    a: "افتح صفحة «أرسل فتواك»، اختر التصنيف المناسب واكتب سؤالك بوضوح، وسيجيبك مفتٍ معتمد بإذن الله.",
  },
];

export default function StudentHelp() {
  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-burgundy/10 text-burgundy flex items-center justify-center">
          <Icon name="help" size={26} />
        </div>
        <h1 className="font-amiri text-2xl text-burgundy mt-2">المساعدة والدعم</h1>
        <p className="font-readex text-sm text-muted-foreground">إجابات عن أكثر الأسئلة شيوعاً</p>
      </div>

      <div className="space-y-3">
        {FAQS.map((f) => (
          <GlassCard key={f.q} hover={false} className="p-0 overflow-hidden">
            <details className="group">
              <summary className="flex items-center gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="w-9 h-9 rounded-full bg-gold/15 text-gold-dark dark:text-gold flex items-center justify-center shrink-0">
                  <Icon name="help" size={16} />
                </span>
                <span className="flex-1 font-readex font-bold text-sm">{f.q}</span>
                <Icon name="arrow-left" size={16} className="text-muted-foreground shrink-0 transition-transform duration-200 group-open:-rotate-90" />
              </summary>
              <p className="px-4 pb-4 font-readex text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="p-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
          <Icon name="phone" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-readex font-bold text-sm">الدعم الفني</div>
          <p className="font-readex text-xs text-muted-foreground mt-0.5">للدعم الفني راسل الإدارة من الإشعارات</p>
        </div>
      </GlassCard>
    </div>
  );
}
