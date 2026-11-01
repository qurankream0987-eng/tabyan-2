import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { I18nManager, Platform, View } from "react-native";
import { useFonts } from "expo-font";
// Per-weight imports: the package barrels pull every weight/italic TTF into the bundle.
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic/500Medium";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic/700Bold";
import { Amiri_400Regular } from "@expo-google-fonts/amiri/400Regular";
import { Amiri_700Bold } from "@expo-google-fonts/amiri/700Bold";
import { ToastProvider } from "../lib/toast";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../lib/theme";
import { TRPCProvider } from "../lib/trpc";
import { AuthProvider, navigateToWelcome, useAuth } from "../lib/auth";
import { usePathname, useRouter } from "expo-router";
import TabyanSplash from "../components/app/TabyanSplash";
import IOSSplash from "../components/app/IOSSplash";
import IOSStartupFailure from "../components/app/IOSStartupFailure";
import { iosDestinationReady, iosSplashMotion } from "../lib/platform/ios-splash-lifecycle";
import { IOSWelcomeLogoVisible } from "../lib/platform/ios-welcome-visibility";
import { splashColors } from "../constants/splash";
import { MUSHAF_COLORS } from "../components/mushaf/mushaf-page";

// Screens lay out right-to-left by hand (row-reverse, textAlign "right"), so the
// native layout must never mirror them for an Arabic device language. The setting
// persists for the next launch; plugins/with-fixed-layout-direction covers the first.
if (Platform.OS !== "web") {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

if (Platform.OS === "ios") {
  SplashScreen.setOptions({ fade: true, duration: iosSplashMotion.nativeFade });
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
} else if (Platform.OS !== "web") void SplashScreen.preventAutoHideAsync();

function AppShell({ onStartupComplete, onStartupFailure }: { onStartupComplete: () => void; onStartupFailure: () => void }) {
  const { isDark, colors, ready: themeReady } = useTheme();
  const { ready: authReady, token, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const previousToken = useRef<string | null>(null);
  const hydrated = useRef(false);
  const nativeHideRequested = useRef(false);
  const [splashLayoutReady, setSplashLayoutReady] = useState(false);
  const [splashStarted, setSplashStarted] = useState(false);
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [iosPrepared, setIOSPrepared] = useState(false);
  const [paintedPath, setPaintedPath] = useState<string | null>(null);
  const destinationReady = iosDestinationReady(authReady, themeReady, token, role, pathname);

  const handleSplashLayout = useCallback(() => setSplashLayoutReady(true), []);
  const handleIOSPrepared = useCallback(() => setIOSPrepared(true), []);
  const finishStartupSplash = useCallback(() => {
    setShowStartupSplash(false);
    onStartupComplete();
  }, [onStartupComplete]);

  useEffect(() => {
    if (Platform.OS !== "ios" || !showStartupSplash) return;
    setPaintedPath(null);
    if (!destinationReady) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPaintedPath(pathname));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [destinationReady, pathname, showStartupSplash]);

  useEffect(() => {
    if (!authReady) return;
    if (hydrated.current && previousToken.current && !token) navigateToWelcome(router);
    previousToken.current = token;
    hydrated.current = true;
  }, [authReady, router, token]);

  useEffect(() => {
    if (Platform.OS === "ios") {
      if (!iosPrepared || nativeHideRequested.current) return;
      nativeHideRequested.current = true;
      // The React image is loaded. Run its entrance under the native fade, not after it.
      setSplashStarted(true);
      void SplashScreen.hideAsync().catch(onStartupFailure);
      return;
    }
    if (!authReady || !themeReady || !splashLayoutReady) return;
    if (Platform.OS === "web") {
      setSplashStarted(true);
      return;
    }
    if (nativeHideRequested.current) return;
    nativeHideRequested.current = true;
    void SplashScreen.hideAsync()
      .catch((error) => console.warn("Could not hide the native splash screen.", error))
      .finally(() => setSplashStarted(true));
  }, [authReady, iosPrepared, onStartupFailure, splashLayoutReady, themeReady]);

  return (
    <View style={{ flex: 1, backgroundColor: Platform.OS === "ios"
      ? colors.background
      : showStartupSplash ? splashColors.background : colors.background }}>
      {/* The Mushaf reader is printed paper edge to edge: its cream runs under the status bar too. */}
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: pathname === "/student/mushaf" ? MUSHAF_COLORS.paper : undefined }}>
        <StatusBar style={showStartupSplash || isDark ? "light" : "dark"} />
        {Platform.OS === "ios" ? <IOSWelcomeLogoVisible.Provider value={!showStartupSplash}><View
          style={{ flex: 1 }}
          accessibilityElementsHidden={Platform.OS === "ios" && showStartupSplash}
          importantForAccessibility={Platform.OS === "ios" && showStartupSplash ? "no-hide-descendants" : "auto"}
        >
          <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
        </View></IOSWelcomeLogoVisible.Provider> : <Stack screenOptions={{ headerShown: false, animation: "fade" }} />}
      </SafeAreaView>
      {showStartupSplash && (Platform.OS === "ios" ? (
        <IOSSplash
          active={splashStarted}
          fadeLogoFirst={pathname === "/guest"}
          ready={destinationReady && paintedPath === pathname}
          onPrepared={handleIOSPrepared}
          onFinish={finishStartupSplash}
          onFailure={onStartupFailure}
        />
      ) : (
        <TabyanSplash
          active={splashStarted}
          onFinish={finishStartupSplash}
          onLayout={handleSplashLayout}
        />
      ))}
    </View>
  );
}

export default function RootLayout() {
  const [startupComplete, setStartupComplete] = useState(false);
  const [startupFailed, setStartupFailed] = useState(false);
  const completeStartup = useCallback(() => setStartupComplete(true), []);
  const failStartup = useCallback(() => setStartupFailed(true), []);
  useEffect(() => {
    if (Platform.OS !== "ios" || startupComplete || startupFailed) return;
    const timeout = setTimeout(failStartup, iosSplashMotion.bootstrapTimeout);
    return () => clearTimeout(timeout);
  }, [failStartup, startupComplete, startupFailed]);
  const [loaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
  });
  const ready = Platform.OS === "web" || loaded || !!fontError;

  if (Platform.OS === "ios" && (startupFailed || fontError)) return <IOSStartupFailure />;
  if (!ready) return <View style={{ flex: 1, backgroundColor: splashColors.background }} />;
  return <SafeAreaProvider><ThemeProvider><TRPCProvider><AuthProvider><ToastProvider><AppShell onStartupComplete={completeStartup} onStartupFailure={failStartup} /></ToastProvider></AuthProvider></TRPCProvider></ThemeProvider></SafeAreaProvider>;
}
