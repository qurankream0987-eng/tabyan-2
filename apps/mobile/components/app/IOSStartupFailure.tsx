import { StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { splashColors } from "../../constants/splash";

export default function IOSStartupFailure() {
  return (
    <View
      style={styles.root}
      onLayout={() => { void SplashScreen.hideAsync().catch(() => undefined); }}
      accessibilityRole="alert"
    >
      <StatusBar style="light" />
      <Text style={styles.title}>تعذّر إكمال بدء تبيان</Text>
      <Text style={styles.message}>أغلق التطبيق وافتحه مرة أخرى. لم تُحذف بيانات حسابك.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: splashColors.background, alignItems: "center", justifyContent: "center", padding: 28 },
  title: { color: splashColors.gold, fontSize: 24, fontWeight: "600", textAlign: "center", writingDirection: "rtl", marginBottom: 16 },
  message: { color: splashColors.warmText, fontSize: 17, lineHeight: 28, textAlign: "center", writingDirection: "rtl" },
});
