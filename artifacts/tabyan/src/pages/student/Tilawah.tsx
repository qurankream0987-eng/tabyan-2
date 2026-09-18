import { useNavigate } from "react-router";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";

function Bullet() {
  return <span className="mt-[7px] shrink-0 inline-block w-2 h-2 rotate-45 bg-gradient-to-br from-gold to-amber-600 rounded-[2px] shadow-[0_0_6px_rgba(212,175,55,.55)]" />;
}

/** شاشة تصحيح التلاوة — مسار مفتوح للجميع بلا اختبار قبول */
export default function Tilawah() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <div className="text-center pt-2 mb-6">
        <h1 className="font-amiri text-4xl font-extrabold text-burgundy mb-2">تصحيح التلاوة</h1>
        <p className="font-readex text-sm text-muted-foreground">مسار مخصص لتصحيح وتحسين التلاوة فقط، متاح لجميع الأعمار.</p>
      </div>

      <GlassCard className="p-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gold/15 flex items-center justify-center text-gold-dark dark:text-gold mb-4">
          <Icon name="mic" size={32} />
        </div>
        <h2 className="font-amiri text-2xl font-extrabold text-burgundy mb-3">عن المسار</h2>
        <p className="font-readex text-sm text-muted-foreground leading-relaxed px-4">
          صحح تلاوتك مع شيخ متقن ضمن خطة منهجية متكاملة.
        </p>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="font-readex text-sm font-bold text-burgundy mb-4 flex items-center gap-2"><Icon name="books" size={18}/>وصف المسار</div>
        <ul className="space-y-3">
          {["وجه واحد في الحلقة", "حصتان أسبوعياً"].map((p) => (
            <li key={p} className="font-readex text-sm font-bold flex items-start gap-2.5 text-foreground"><Bullet />{p}</li>
          ))}
        </ul>
      </GlassCard>

      <PrimaryButton className="w-full mt-2 py-3.5 text-base font-readex" onClick={() => navigate("/student/booking?path=tajweed_correction")}>
        <span className="inline-flex items-center gap-2"><Icon name="mic" size={20}/>سجل في الحلقة</span>
      </PrimaryButton>
    </div>
  );
}
