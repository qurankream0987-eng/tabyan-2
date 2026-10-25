import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import { authStore } from "@/lib/auth";
import { DEMO_PLACEMENT_STATUS } from "@/lib/demo/student-core";

export default function Pending() {
  const DEMO = authStore.isDemo;
  const { data, isLoading } = trpc.student.placementStatus.useQuery(undefined, { refetchInterval: DEMO ? false : 15000, enabled: !DEMO });
  if (!DEMO && isLoading) return <div className="h-40 skeleton rounded-[1.5rem]" />;
  const statusData = DEMO ? DEMO_PLACEMENT_STATUS : data;
  const approved = statusData?.status === "approved";

  return (
    <div className="max-w-lg mx-auto pt-8 page-enter">
      <GlassCard className="p-6 text-center">
        <div className="mb-3 flex justify-center text-burgundy"><Icon name={approved ? "graduation" : "clock"} size={44} /></div>
        <h1 className="font-amiri text-2xl text-burgundy">
          {approved ? "تم اعتماد مستواك!" : "اختبارك قيد المراجعة"}
        </h1>
        {approved ? (
          <>
            <p className="font-readex mt-2">مستواك: <b className="text-gold-dark dark:text-gold">{statusData?.resultLevelName}</b></p>
            {statusData?.notes && <p className="font-readex text-sm text-muted-foreground mt-1">ملاحظات المراجع: {statusData.notes}</p>}
            <Link to="/student/path"><PrimaryButton className="w-full mt-5">ابدأ رحلتك — اختر مسارك</PrimaryButton></Link>
          </>
        ) : (
          <>
            <p className="font-readex text-sm text-muted-foreground mt-2 leading-relaxed">
              يراجع المسؤول اختبار تحديد المستوى الآن.<br />ستصلك النتيجة خلال <b>24 ساعة</b> كحد أقصى
            </p>
            <div className="mt-4 h-2 rounded-full bg-burgundy/10 overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-l from-burgundy to-gold rounded-full animate-pulse" />
            </div>
            <Link to="/student/home" className="block mt-5 text-sm font-readex text-burgundy hover:underline">العودة للرئيسية</Link>
          </>
        )}
      </GlassCard>
    </div>
  );
}
