import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminFrame, ConfirmButton, KYC_CONFIRM, safeError, useCertificateOpener, useKycReview } from "../../components/admin/admin-common";
import { AdminSheet, ListSkeleton } from "../../components/admin/admin-ui";
import { Badge, Button, Card, EmptyState, ErrorState, Icon, PageHero, initials } from "../../components/ui";
import { LibraryMediaPlayer } from "../../components/library/library-media-player";
import { trpc } from "../../lib/trpc";
import { palette, useTheme } from "../../lib/theme";

type Certificate = { id: string; filePath: string; title: string | null };
type Applicant = {
  teacherId: string; name: string; phone?: string | null; videoUrl: string | null; hoursAgo: number;
  answers: { q: string; a: string }[] | null; bio: string | null; specialization: string | null; experienceYears: number | null; certificates: Certificate[];
};

/** Web AdminTeachersReview: the 24h review window turns red from the 20th hour. */
const DEADLINE_WARNING_HOURS = 20;

function normalizeAnswers(value: unknown): Applicant["answers"] {
  if (!Array.isArray(value)) return null;
  const rows = value.map((item: any) => ({ q: String(item?.q ?? item?.question ?? ""), a: String(item?.a ?? item?.answer ?? "") })).filter((item) => item.q || item.a);
  return rows.length ? rows : null;
}

// ── مراجعة المعلمين مطابقة للموقع (AdminTeachersReview.tsx):
//    بطاقة لكل متقدم → «تشغيل ومراجعة» يفتح الفيديو والشهادات والقرار → الإجابات العشر قابلة للطي داخل البطاقة
export default function TeachersReview() {
  const { colors, isDark } = useTheme();
  const q = trpc.admin.kycList.useQuery();
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const close = () => { setSelected(null); setNotes(""); };
  const kyc = useKycReview(close);
  const openCertificate = useCertificateOpener();

  const items: Applicant[] = (Array.isArray(q.data) ? q.data : []).map((r: any) => ({
    teacherId: String(r.teacherId), name: String(r.name ?? "معلم"), phone: r.phone ?? null, videoUrl: typeof r.videoUrl === "string" && r.videoUrl.trim() ? r.videoUrl : null,
    hoursAgo: Math.max(0, Math.round(Number(r.hoursAgo) || 0)), answers: normalizeAnswers(r.answers), bio: r.bio ?? null, specialization: r.specialization ?? null,
    experienceYears: r.experienceYears ?? null, certificates: Array.isArray(r.certificates) ? r.certificates : [],
  }));
  const review = (decision: "approve" | "reject" | "request_info") => { if (selected) void kyc.review(selected.teacherId, decision, notes); };
  const tint = isDark ? `${palette.gold}14` : `${palette.burgundy}0D`;

  return (
    <AdminFrame title="مراجعة المعلمين">
      <PageHero icon="id-card-outline" title="مراجعة المعلمين" subtitle={q.data ? (items.length ? `${items.length} طلب انضمام بانتظار قرارك` : "كل طلبات القبول مُراجعة") : undefined} />
      {q.isLoading ? <ListSkeleton rows={4} /> : q.error ? <ErrorState message={safeError(q.error, "تعذّر تحميل البيانات. تحقق من الاتصال وأعد المحاولة.")} onRetry={() => void q.refetch()} />
        : !items.length ? <EmptyState title="لا طلبات معلقة" description="كل طلبات القبول مُراجعة" />
        : items.map((it) => {
          const late = it.hoursAgo >= DEADLINE_WARNING_HOURS;
          const open = !!expanded[it.teacherId];
          return (
            <Card key={it.teacherId}>
              <View style={styles.head}>
                <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: palette.gold }]}><Text style={[styles.avatarText, { color: colors.primaryText }]}>{initials(it.name)}</Text></View>
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{it.name}</Text>
                  {it.phone ? <Text style={[styles.phone, { color: colors.muted }]}>{it.phone}</Text> : null}
                  <View style={styles.timeRow}>
                    <Icon name="timer-outline" size={13} color={late ? colors.danger : colors.muted} />
                    <Text style={[late ? styles.timeLate : styles.time, { color: late ? colors.danger : colors.muted }]}>منذ {it.hoursAgo} ساعة{late ? " — اقتربت مهلة 24س!" : ""}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.meta}>
                <Badge label={it.videoUrl ? "فيديو تعريفي مرفق" : "لا فيديو مرفق"} tone={it.videoUrl ? "gold" : "danger"} />
                <Badge label={it.certificates.length ? `${it.certificates.length} شهادة` : "لا شهادات"} tone={it.certificates.length ? "info" : "muted"} />
              </View>
              <Button label="تشغيل ومراجعة" icon="play-circle-outline" onPress={() => { setSelected(it); setNotes(""); }} />
              {it.answers ? (
                <View style={[styles.answersWrap, { borderTopColor: colors.border }]}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded((c) => ({ ...c, [it.teacherId]: !open }))} style={styles.answersToggle}>
                    <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                    <Text style={[styles.answersToggleText, { color: colors.primary }]}>{open ? "إخفاء إجابات الأسئلة" : "عرض إجابات الأسئلة العشرة"}</Text>
                  </Pressable>
                  {open ? it.answers.map((qa, i) => (
                    <View key={i} style={[styles.answer, { backgroundColor: tint }]}>
                      <Text style={[styles.question, { color: colors.text }]}>{i + 1}. {qa.q}</Text>
                      <Text style={[styles.answerText, { color: colors.muted }]}>{qa.a || "—"}</Text>
                    </View>
                  )) : null}
                </View>
              ) : null}
            </Card>
          );
        })}

      <AdminSheet visible={!!selected} title={selected?.name ?? ""} subtitle="مراجعة طلب انضمام معلم" onClose={close} dirty={!!notes.trim()} busy={kyc.pending}
        footer={<View style={styles.footer}>
          <ConfirmButton primary label="اعتماد" icon="checkmark-outline" disabled={kyc.pending} loading={kyc.pending && kyc.decision === "approve"} title={KYC_CONFIRM.approve.title} itemName={selected?.name} impact={KYC_CONFIRM.approve.impact} confirmLabel={KYC_CONFIRM.approve.label} onConfirm={() => review("approve")} />
          <ConfirmButton danger label="رفض" icon="close-outline" disabled={kyc.pending} loading={kyc.pending && kyc.decision === "reject"} title={KYC_CONFIRM.reject.title} itemName={selected?.name} impact={KYC_CONFIRM.reject.impact} confirmLabel={KYC_CONFIRM.reject.label} onConfirm={() => review("reject")} />
          <Button label="طلب معلومات" variant="secondary" icon="information-circle-outline" disabled={kyc.pending || !notes.trim()} loading={kyc.pending && kyc.decision === "request_info"} onPress={() => review("request_info")} />
        </View>}>
        {selected ? <>
          {selected.specialization || selected.experienceYears != null || selected.bio ? (
            <View style={[styles.info, { backgroundColor: tint, borderColor: colors.border }]}>
              {selected.specialization ? <Text style={[styles.infoStrong, { color: colors.primary }]}>التخصص: {selected.specialization}</Text> : null}
              {selected.experienceYears != null ? <Text style={[styles.infoText, { color: colors.muted }]}>سنوات الخبرة: {selected.experienceYears}</Text> : null}
              {selected.bio ? <Text style={[styles.infoText, { color: colors.muted }]}>{selected.bio}</Text> : null}
            </View>
          ) : null}
          {selected.videoUrl ? <LibraryMediaPlayer source={selected.videoUrl} contentType="video" /> : (
            <View style={[styles.noVideo, { backgroundColor: tint, borderColor: colors.border }]}><Text style={[styles.infoText, { color: colors.muted }]}>لا فيديو مرفق</Text></View>
          )}
          <View style={styles.sectionHead}><Icon name="ribbon-outline" size={15} color={colors.text} /><Text style={[styles.sectionTitle, { color: colors.text }]}>الشهادات والمؤهلات</Text></View>
          {selected.certificates.length ? selected.certificates.map((c) => (
            <Button key={c.id} label={c.title || "شهادة بدون عنوان"} variant="secondary" icon="document-text-outline" onPress={() => void openCertificate(c.filePath)} />
          )) : <Text style={[styles.infoText, { color: colors.muted }]}>لا شهادات مرفوعة</Text>}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>ملاحظات المراجعة</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline maxLength={500} placeholder="ما الذي ينقص هذا الطلب؟" placeholderTextColor={colors.muted} textAlignVertical="top"
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
          <Text style={[styles.helper, { color: colors.muted }]}>تظهر للمعلم — مطلوبة عند طلب معلومات إضافية</Text>
        </> : null}
      </AdminSheet>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 17, includeFontPadding: false },
  copy: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 23, textAlign: "right" },
  phone: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right", writingDirection: "ltr" },
  timeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 2 },
  time: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17 },
  timeLate: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, lineHeight: 17 },
  meta: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginVertical: 10 },
  answersWrap: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 6, gap: 6 },
  answersToggle: { minHeight: 40, flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  answersToggleText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, lineHeight: 18 },
  answer: { borderRadius: 12, padding: 10, gap: 2 },
  question: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, lineHeight: 18, textAlign: "right" },
  answerText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right" },
  footer: { gap: 8 },
  info: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 3, marginBottom: 10 },
  infoStrong: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 19, textAlign: "right" },
  infoText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right" },
  noVideo: { minHeight: 88, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
  sectionTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 20, textAlign: "right" },
  input: { minHeight: 96, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, lineHeight: 22, textAlign: "right", marginTop: 6 },
  helper: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 5 },
});
