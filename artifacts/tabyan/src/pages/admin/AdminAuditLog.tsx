import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";

// تسميات عربية للإجراءات — أي إجراء غير معروف يُعرض باسمه الخام كي لا يُخفى شيء
const ACTION_LABELS: Record<string, string> = {
  login: "تسجيل دخول للوحة الإشراف",
  create_supervisor: "إنشاء مشرف",
  create_teacher: "إنشاء معلم",
  activate_account: "تنشيط حساب",
  deactivate_account: "إيقاف حساب",
  reset_account_password: "إعادة تعيين كلمة سر",
  terminate_account_sessions: "إنهاء جلسات حساب",
  force_logout_admin: "إنهاء جلسة مشرف",
  change_master_password: "تغيير كلمة المرور الرئيسية",
  update_setting: "تعديل إعداد",
  message_user: "مراسلة مستخدم",
  warn_user: "تحذير مستخدم",
  ban_user: "حظر مستخدم",
  delete_user: "حذف مستخدم",
  soft_delete_teacher: "حذف معلم (أرشفة)",
  create_schedule: "إنشاء جدول",
  activate_schedule: "تنشيط جدول",
  deactivate_schedule: "إيقاف جدول",
  delete_schedule: "حذف جدول",
  open_schedule_booking: "فتح الحجز لجدول",
  close_schedule_booking: "إغلاق الحجز لجدول",
  cancel_booking: "إلغاء حجز",
  create_level: "إنشاء مستوى",
  update_level: "تعديل مستوى",
  delete_level: "حذف مستوى",
  swap_level_order: "تبديل ترتيب مستويين",
  approve_promotion: "اعتماد ترقية",
  reject_promotion: "رفض ترقية",
  approve_qiraat: "اعتماد إجازة قراءات",
  reject_qiraat: "رفض إجازة قراءات",
  review_placement: "مراجعة اختبار تحديد مستوى",
  request_teacher_info: "طلب معلومات من معلم",
  approve_teacher: "اعتماد معلم",
  reject_teacher: "رفض معلم",
  assign_fatwa: "إسناد فتوى",
  update_fatwa_category: "تعديل تصنيف فتوى",
  fatwa_answer_approve: "اعتماد جواب فتوى",
  fatwa_answer_reject: "رفض جواب فتوى",
  reject_fatwa_question: "رفض سؤال فتوى",
  assign_mufti: "تعيين مفتٍ",
  unassign_mufti: "إلغاء تعيين مفتٍ",
  create_book: "إضافة كتاب",
  update_book: "تعديل كتاب",
  delete_book: "حذف كتاب",
  archive_book: "أرشفة كتاب",
  restore_book: "استعادة كتاب",
  create_assessment: "إنشاء تقييم",
  update_assessment: "تعديل تقييم",
  add_question: "إضافة سؤال لتقييم",
  add_questions: "إضافة أسئلة لتقييم",
  send_notification: "إرسال إشعار",
  enable_recurring_notification: "تفعيل إشعار متكرر",
  disable_recurring_notification: "إيقاف إشعار متكرر",
};

const TARGET_LABELS: Record<string, string> = {
  user: "مستخدم", student: "طالب", teacher: "معلم", session: "جلسة",
  weekly_schedule: "جدول أسبوعي", level: "مستوى", promotion_request: "طلب ترقية",
  qiraat_certificate: "إجازة قراءات", fatwa_question: "سؤال فتوى", fatwa_answer: "جواب فتوى",
  book: "كتاب", assessment: "تقييم", notification: "إشعار",
  system_setting: "إعداد نظام", admin_session: "جلسة إشراف",
};

const actionLabel = (a: string) => ACTION_LABELS[a] ?? a;
const targetLabel = (t: string) => TARGET_LABELS[t] ?? t;

export default function AdminAuditLog() {
  const DEMO = authStore.isDemo;
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = trpc.admin.auditLogsList.useQuery(
    { page, action: action || undefined, targetType: targetType || undefined },
    { enabled: !DEMO },
  );
  const data = q.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2">
        <Icon name="clipboard" size={24} />سجل التدقيق
      </h1>
      <p className="font-readex text-xs text-muted-foreground">
        كل إجراءات الإشراف مسجّلة هنا بترتيب زمني تنازلي — من فعل ماذا ومتى.
      </p>

      {DEMO ? (
        <GlassCard className="p-6">
          <EmptyState title="وضع العرض التجريبي" hint="سجل التدقيق يتطلب تشغيل الخادم" />
        </GlassCard>
      ) : (
        <>
          {/* التصفية */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-readex text-xs text-muted-foreground flex items-center gap-1"><Icon name="filter" size={14} />تصفية:</span>
              <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
                className="rounded-xl border border-input bg-background px-3 py-2 font-readex text-xs">
                <option value="">كل الإجراءات</option>
                {(data?.actions ?? []).map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
              </select>
              <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
                className="rounded-xl border border-input bg-background px-3 py-2 font-readex text-xs">
                <option value="">كل المستهدفات</option>
                {(data?.targetTypes ?? []).map((t) => <option key={t} value={t}>{targetLabel(t)}</option>)}
              </select>
              {(action || targetType) && (
                <button onClick={() => { setAction(""); setTargetType(""); setPage(1); }}
                  className="font-readex text-xs text-burgundy underline underline-offset-2">
                  إزالة التصفية
                </button>
              )}
              {data && <span className="font-readex text-[11px] text-muted-foreground mr-auto">{data.total} سجلاً</span>}
            </div>
          </GlassCard>

          {/* السجل */}
          <GlassCard className="p-4">
            {q.isLoading ? (
              <div className="h-64 skeleton rounded-[1.5rem]" />
            ) : !data || data.rows.length === 0 ? (
              <EmptyState title="لا سجلات" hint="لم تُسجَّل إجراءات مطابقة بعد" />
            ) : (
              <div className="space-y-1">
                {data.rows.map((r) => (
                  <div key={r.id} className="rounded-xl bg-burgundy/5 dark:bg-white/5">
                    <button onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-right hover:bg-burgundy/10 dark:hover:bg-white/10 rounded-xl transition">
                      <span className="font-readex text-sm font-bold text-burgundy">{actionLabel(r.action)}</span>
                      <span className="font-readex text-[11px] rounded-full bg-gold/15 px-2 py-0.5">{targetLabel(r.targetType)}</span>
                      <span className="flex-1" />
                      <span className="font-readex text-xs text-foreground">{r.adminName ?? r.adminUsername ?? "مشرف محذوف"}</span>
                      <span className="font-readex text-[11px] text-muted-foreground" dir="ltr">{fmtDateTime(r.createdAt)}</span>
                    </button>
                    {openId === r.id && (
                      <div className="px-4 pb-3 space-y-1 font-readex text-[11px] text-muted-foreground">
                        {r.targetId && <div>المستهدف: <span dir="ltr">{r.targetId}</span></div>}
                        {r.ipAddress && <div>عنوان الشبكة: <span dir="ltr">{r.ipAddress}</span></div>}
                        {r.details != null && (
                          <pre dir="ltr" className="whitespace-pre-wrap break-all rounded-lg bg-background/60 p-2 text-[10px] text-left">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        )}
                        {!r.targetId && !r.ipAddress && r.details == null && <div>لا تفاصيل إضافية</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ترقيم الصفحات */}
            {data && totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-input px-4 py-2 font-readex text-xs disabled:opacity-40 hover:bg-burgundy/5 transition">
                  السابق
                </button>
                <span className="font-readex text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-input px-4 py-2 font-readex text-xs disabled:opacity-40 hover:bg-burgundy/5 transition">
                  التالي
                </button>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
}
