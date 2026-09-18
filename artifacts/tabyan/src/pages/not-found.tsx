import { useNavigate } from "react-router";
import GlassCard from "@/components/app/GlassCard";
import Icon from "@/components/app/Icon";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <GlassCard className="w-full max-w-md p-10 text-center space-y-6">
        {/* أيقونة SVG */}
        <div className="w-24 h-24 mx-auto rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center">
          <Icon name="alert-triangle" size={44} className="text-burgundy" />
        </div>

        {/* الرقم */}
        <div className="hero-greeting font-amiri text-8xl font-extrabold leading-none">
          ٤٠٤
        </div>

        {/* العنوان */}
        <div className="space-y-2">
          <h1 className="font-amiri text-2xl font-bold text-burgundy">
            الصفحة غير موجودة
          </h1>
          <p className="font-readex text-sm text-muted-foreground leading-relaxed">
            يبدو أنك وصلت إلى صفحة غير موجودة أو تم نقلها إلى مكان آخر
          </p>
        </div>

        {/* خط فاصل ذهبي */}
        <div
          className="mx-auto rounded-full"
          style={{ width: 80, height: 2, background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }}
        />

        {/* الأزرار */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-bubble btn-primary-bubble w-full py-3 font-readex text-sm font-extrabold"
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="arrow-right" size={16} />
              العودة للخلف
            </span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="btn-bubble btn-secondary-bubble w-full py-3 font-readex text-sm font-extrabold"
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="home" size={16} />
              الصفحة الرئيسية
            </span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
