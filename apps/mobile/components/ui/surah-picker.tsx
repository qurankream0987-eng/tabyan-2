import { FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { useTheme } from "../../lib/theme";
import { Icon } from "./index";

const SURAH_ROW_HEIGHT = 48;

/** Bottom sheet listing every surah with its verse count (the web `<select>`). */
export function SurahPicker({ visible, selected, onPick, onClose }: { visible: boolean; selected: number; onPick: (n: number) => void; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="إغلاق" style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.primary }]}>اختر السورة</Text>
          <FlatList
            data={SURAHS}
            keyExtractor={(s) => String(s.n)}
            initialScrollIndex={Math.max(0, selected - 1)}
            getItemLayout={(_, index) => ({ length: SURAH_ROW_HEIGHT, offset: SURAH_ROW_HEIGHT * index, index })}
            renderItem={({ item }) => {
              const active = item.n === selected;
              return (
                <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onPick(item.n)} style={[styles.surahRow, { backgroundColor: active ? colors.selected : "transparent" }]}>
                  <Text style={[styles.surahNumber, { color: colors.muted }]}>{item.n}</Text>
                  <Text style={[styles.surahName, { color: active ? colors.primary : colors.text }]}>{item.name}</Text>
                  <Text style={[styles.surahCount, { color: colors.muted }]}>{item.ayahs} آية</Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** The closed field that opens the sheet: "2. البقرة — 286 آية". */
export function SurahField({ selected, onPress, disabled = false }: { selected: number; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const surah = SURAHS[selected - 1] ?? SURAHS[0];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="اختيار السورة" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.field, { borderColor: colors.border, backgroundColor: colors.input, opacity: disabled ? 0.6 : 1 }]}>
      <Text style={[styles.fieldText, { color: colors.text }]} numberOfLines={1}>{surah.n}. {surah.name} — {surah.ayahs} آية</Text>
      {disabled ? null : <Icon name="chevron-down" size={16} color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 12 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginTop: 10, marginBottom: 6 },
  sheetTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, lineHeight: 30, textAlign: "center", marginBottom: 6 },
  surahRow: { height: SURAH_ROW_HEIGHT, flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  surahNumber: { width: 30, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "center" },
  surahName: { flex: 1, fontFamily: "Amiri_700Bold", fontSize: 17, textAlign: "right" },
  surahCount: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
  field: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  fieldText: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, textAlign: "right" },
});
