import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { SvgIcon } from "../ui";
import { palette, useTheme } from "../../lib/theme";
import type { RecitationLocation } from "../../lib/recitation/recitation-anywhere";

/**
 * The popup over the screen the reader was on while the place to recite from is found: a
 * listening microphone, the words heard so far, and, when they are read alike in several
 * places, those places to pick from.
 */
export function RecitationLocatePopup({
  preparing,
  opening,
  heard,
  candidates,
  ayahText,
  onChoose,
  onCancel,
}: {
  preparing: boolean;
  /** The place is found and its page is being opened. */
  opening: RecitationLocation | null;
  heard: string;
  candidates: RecitationLocation[];
  ayahText: (verseKey: string) => string;
  onChoose: (location: RecitationLocation) => void;
  onCancel: () => void;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = isDark ? palette.gold : palette.burgundy;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const listening = !preparing && !opening;
  const title = opening
    ? `سورة ${SURAHS[opening.surah - 1]?.name ?? ""} · الآية ${opening.ayah}`
    : candidates.length ? "الآية في أكثر من موضع" : "اقرأ من أي موضع";
  const subtitle = preparing
    ? "جارٍ تجهيز الميكروفون…"
    : opening ? "جارٍ فتح الصفحة…"
    : candidates.length ? "اختر الموضع الذي تقرأ منه، أو تابع القراءة ليتضح" : "ابدأ بالآية التي تريد أن تسمّع منها، وسنفتح لك موضعها";

  return (
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 18 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.micArea}>
          {listening ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, { borderColor: accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]}
            />
          ) : null}
          <View style={[styles.mic, { backgroundColor: accent }]}>
            <SvgIcon name={opening ? "quran" : "mic"} size={30} color={isDark ? palette.night : "#FFFFFF"} />
          </View>
        </View>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        {heard && !opening ? (
          <View style={[styles.heard, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Text numberOfLines={2} style={[styles.heardText, { color: colors.text }]}>{heard}</Text>
          </View>
        ) : null}
        {candidates.length && !opening ? (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {candidates.map((candidate) => (
              <Pressable
                key={candidate.verseKey}
                accessibilityRole="button"
                onPress={() => onChoose(candidate)}
                style={({ pressed }) => [styles.candidate, { borderColor: colors.border, backgroundColor: pressed ? colors.selected : colors.background }]}
              >
                <Text style={[styles.candidateTitle, { color: accent }]}>
                  {`سورة ${SURAHS[candidate.surah - 1]?.name ?? candidate.surah} · الآية ${candidate.ayah} · صفحة ${candidate.page}`}
                </Text>
                <Text numberOfLines={2} style={[styles.candidateText, { color: colors.text }]}>{ayahText(candidate.verseKey)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => [styles.cancel, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.cancelText, { color: colors.muted }]}>إلغاء</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, alignItems: "stretch", maxHeight: "86%" },
  handle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, marginBottom: 18 },
  micArea: { alignSelf: "center", width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  ring: { position: "absolute", width: 76, height: 76, borderRadius: 38, borderWidth: 3 },
  mic: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Amiri_700Bold", fontSize: 22, lineHeight: 36, textAlign: "center" },
  subtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "center", marginTop: 2, marginBottom: 14 },
  heard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  heardText: { fontFamily: "Amiri_400Regular", fontSize: 19, lineHeight: 32, textAlign: "center" },
  list: { flexGrow: 0, maxHeight: 300, marginBottom: 12 },
  listContent: { gap: 8 },
  candidate: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  candidateTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 21, textAlign: "right" },
  candidateText: { fontFamily: "Amiri_400Regular", fontSize: 17, lineHeight: 29, textAlign: "right" },
  cancel: { minHeight: 46, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14 },
});
