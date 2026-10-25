import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { fmtDate } from "@/lib/format";

export default function ShariaCertificate() {
  const { levelId } = useParams<{ levelId: string }>();
  const nav = useNavigate();
  const { data, isLoading } = trpc.sharia.certificate.useQuery(
    { levelId: Number(levelId) },
    { enabled: !!levelId }
  );

  if (isLoading) {
    return (
      <div className="space-y-3 page-enter">
        <div className="h-64 skeleton rounded-[1.5rem]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-enter">
        <EmptyState title="لا توجد شهادة" hint="أكمل المستوى والحصول على درجة ناجحة للحصول على الشهادة" />
        <SecondaryButton className="mt-4 w-full" onClick={() => nav(-1)}>
          العودة
        </SecondaryButton>
      </div>
    );
  }

  const { certificate, level, subject } = data;

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="icon-badge icon-badge--sm">
          <Icon name="arrow-right" size={16} />
        </button>
        <h1 className="font-amiri text-2xl text-burgundy">الشهادة</h1>
      </div>

      {/* Certificate Card */}
      <GlassCard className="p-6 text-center border-2 border-gold/30">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
            <Icon name="graduation" size={32} className="text-gold" />
          </div>
          <p className="font-readex text-xs text-muted-foreground uppercase tracking-wider">شهادة إتمام</p>
        </div>

        <div className="border-t border-b border-gold/20 py-4 my-4">
          <h2 className="font-amiri text-xl text-burgundy mb-2">
            {level?.name}
          </h2>
          <p className="font-readex text-sm text-muted-foreground">
            {subject?.name}
          </p>
        </div>

        <div className="space-y-2 font-readex text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المستوى</span>
            <span className="font-bold">{level?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المادة</span>
            <span className="font-bold">{subject?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">التقدير</span>
            <span className="font-bold text-gold-dark dark:text-gold">{certificate.grade}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاريخ الإصدار</span>
            <span className="font-bold">{fmtDate(certificate.issuedAt)}</span>
          </div>
          {certificate.certificateNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الشهادة</span>
              <span className="font-bold" dir="ltr">{certificate.certificateNumber}</span>
            </div>
          )}
        </div>

        {/* Decorative border */}
        <div className="mt-4 pt-4 border-t border-gold/20">
          <div className="flex justify-center gap-2 text-gold/40">
            <Icon name="star" size={12} />
            <Icon name="star" size={12} />
            <Icon name="star" size={12} />
          </div>
        </div>
      </GlassCard>

      {/* Actions — تحميل الشهادة عبر حوار الطباعة (حفظ كـ PDF) */}
      <div className="flex gap-2 print:hidden">
        <PrimaryButton className="flex-1" onClick={() => window.print()}>
          <span className="inline-flex items-center gap-2">
            <Icon name="external-link" size={16} />
            تحميل الشهادة
          </span>
        </PrimaryButton>
        <SecondaryButton className="flex-1" onClick={() => nav("/student/sharia")}>
          العودة
        </SecondaryButton>
      </div>
    </div>
  );
}
