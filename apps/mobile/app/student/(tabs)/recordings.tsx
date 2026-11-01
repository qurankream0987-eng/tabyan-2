import { useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHero, Screen, SoftPressable } from "../../../components/ui";
import { LibraryMediaPlayer } from "../../../components/library/library-media-player";
import { useAuth } from "../../../lib/auth";
import { formatDateTime } from "../../../lib/format";
import { resolveLibraryAsset } from "../../../lib/media/library-media";
import { trpc } from "../../../lib/trpc";
import { palette, useTheme } from "../../../lib/theme";

// نفس شكل StudentRecordings.tsx على الموقع: بطاقة بمربّع تشغيل داكن، شارة المدة، والدرجة من 100؛
// والضغط يفتح المشغّل الخاص مع شبكة التقييم الرباعية وملاحظات المعلم.
type Evaluation = { totalScore: number; hifzScore: number; revisionScore: number; tajweedScore: number; commitmentScore: number; notes: string | null };
type Rec = { id: string; sessionId: string; videoUrl: string; durationSeconds: number; createdAt: string | Date; teacherName: string; topic: string | null; typeLabel: string; evaluation: Evaluation | null };

const EVAL_CELLS: [string, keyof Evaluation, number][] = [["الحفظ", "hifzScore", 30], ["المراجعة", "revisionScore", 20], ["التجويد", "tajweedScore", 40], ["الالتزام", "commitmentScore", 10]];
const recTitle = (r: Rec) => `${r.typeLabel}${r.topic ? ` — ${r.topic}` : ""}`;

export default function Recordings() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const query = trpc.student.myRecordings.useQuery(undefined, { enabled: !!token });
  const [open, setOpen] = useState<Rec | null>(null);
  if (query.isLoading) return <Screen><LoadingState /></Screen>;
  if (query.error) return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  const rows = (Array.isArray(query.data) ? query.data : []) as unknown as Rec[];
  const tint = isDark ? `${palette.gold}1F` : `${palette.burgundy}14`;
  return (
    <Screen>
      <PageHero icon="videocam-outline" title="تسجيلاتي" />
      {rows.length === 0 ? <EmptyState title="لا تسجيلات بعد" description="ستظهر تسجيلات حلقاتك المكتملة هنا" /> : rows.map((r) => (
        <SoftPressable key={r.id} accessibilityRole="button" accessibilityLabel={`تشغيل ${recTitle(r)}`} onPress={() => setOpen(r)}>
          <Card>
            <View style={styles.row}>
              <View style={[styles.playTile, { backgroundColor: palette.night }]}><Icon name="play" size={22} color={palette.gold} /></View>
              <View style={styles.body}>
                <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{recTitle(r)}</Text>
                <View style={styles.metaRow}>
                  <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>{r.teacherName} · {formatDateTime(r.createdAt)}</Text>
                  <View style={[styles.chip, { backgroundColor: tint }]}><Text style={[styles.chipText, { color: colors.primary }]}>{Math.round(r.durationSeconds / 60)} د</Text></View>
                </View>
              </View>
              {r.evaluation ? (
                <View style={styles.score}>
                  <Text style={[styles.scoreValue, { color: colors.primary }]}>{r.evaluation.totalScore}</Text>
                  <Text style={[styles.scoreLabel, { color: colors.muted }]}>من 100</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </SoftPressable>
      ))}

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="إغلاق" style={StyleSheet.absoluteFill} onPress={() => setOpen(null)} />
          <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]}>
            {open ? (
              <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.grabber, { backgroundColor: colors.border }]} />
                <Text style={[styles.sheetTitle, { color: colors.primary }]}>{recTitle(open)}</Text>
                <LibraryMediaPlayer source={resolveLibraryAsset(open.videoUrl, token)} contentType="video" />
                <View style={styles.noteRow}><Icon name="close" size={12} color={colors.muted} /><Text style={[styles.note, { color: colors.muted }]}>التحميل غير متاح — بث مباشر فقط</Text></View>
                {open.evaluation ? (
                  <View style={[styles.evalBox, { backgroundColor: isDark ? `${palette.gold}0D` : `${palette.burgundy}0D`, borderColor: isDark ? `${palette.gold}14` : `${palette.burgundy}14` }]}>
                    <Text style={[styles.evalTitle, { color: colors.text }]}>تقييم المعلم</Text>
                    <View style={styles.evalGrid}>
                      {EVAL_CELLS.map(([label, key, max]) => (
                        <View key={key} style={[styles.evalCell, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Text style={[styles.evalValue, { color: colors.primary }]}>{String(open.evaluation?.[key] ?? 0)}<Text style={[styles.evalMax, { color: colors.muted }]}>/{max}</Text></Text>
                          <Text style={[styles.evalLabel, { color: colors.muted }]}>{label}</Text>
                        </View>
                      ))}
                    </View>
                    {open.evaluation.notes ? <View style={styles.notesRow}><Icon name="create-outline" size={13} color={colors.muted} /><Text style={[styles.notes, { color: colors.muted }]}>{open.evaluation.notes}</Text></View> : null}
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  playTile: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingLeft: 2, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  body: { flex: 1, minWidth: 0 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" },
  meta: { flexShrink: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right" },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  chipText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 10, lineHeight: 16 },
  score: { alignItems: "center", minWidth: 40 },
  scoreValue: { fontFamily: "Amiri_700Bold", fontSize: 22, lineHeight: 30 },
  scoreLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 14 },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { padding: 20, paddingTop: 10, gap: 12 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 2 },
  sheetTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, lineHeight: 30, textAlign: "center" },
  noteRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5 },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17 },
  evalBox: { borderRadius: 18, borderWidth: 1, padding: 14 },
  evalTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right", marginBottom: 10 },
  evalGrid: { flexDirection: "row-reverse", gap: 6 },
  evalCell: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  evalValue: { fontFamily: "Amiri_700Bold", fontSize: 18, lineHeight: 26 },
  evalMax: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10 },
  evalLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 15 },
  notesRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 6, marginTop: 12 },
  notes: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
});
