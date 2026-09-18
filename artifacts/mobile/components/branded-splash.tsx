import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { palette } from "../lib/theme";

const splashLogo = require("../assets/images/logo-splash-gold.png");

export function BrandedSplash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const verseOpacity = useRef(new Animated.Value(0)).current;
  const verseOffset = useRef(new Animated.Value(24)).current;
  const homeOpacity = useRef(new Animated.Value(0)).current;
  const homeOffset = useRef(new Animated.Value(24)).current;
  const overallOpacity = useRef(new Animated.Value(1)).current;
  const loaderX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    const animateIn = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 900, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.timing(logoScale, { toValue: 1, duration: 1200, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver }),
    ]);
    animateIn.start();

    const verseTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(verseOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver }),
        Animated.timing(verseOffset, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver }),
      ]).start();
    }, 450);

    const homeTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(verseOpacity, { toValue: 0, duration: 450, easing: Easing.in(Easing.cubic), useNativeDriver }),
        Animated.timing(homeOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver }),
        Animated.timing(homeOffset, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver }),
      ]).start();
    }, 1150);

    const fadeTimer = setTimeout(() => {
      Animated.timing(overallOpacity, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.cubic), useNativeDriver }).start();
    }, 2250);

    const doneTimer = setTimeout(onDone, 2800);
    const loaderLoop = Animated.loop(
      Animated.timing(loaderX, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver }),
    );
    loaderLoop.start();

    return () => {
      clearTimeout(verseTimer);
      clearTimeout(homeTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      loaderLoop.stop();
    };
  }, [homeOffset, homeOpacity, loaderX, logoOpacity, logoScale, onDone, overallOpacity, verseOffset, verseOpacity]);

  const logoWidth = Math.min(360, width * 0.84);
  const loaderTravel = Math.max(140, width * 0.7);

  return (
    <Animated.View style={[styles.root, { opacity: overallOpacity, minHeight: height }]} pointerEvents="auto">
      <View style={[styles.halo, { width: Math.min(560, width * 1.25), height: Math.min(560, width * 1.25) }]} />
      <View style={styles.inner}>
        <Animated.View style={[styles.logoWrap, { width: logoWidth, opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image source={splashLogo} resizeMode="contain" style={styles.logo} accessibilityLabel="تبيان" />
          <View style={styles.shine} />
        </Animated.View>

        <View style={styles.textStage}>
          <Animated.View style={[styles.textItem, { opacity: verseOpacity, transform: [{ translateY: verseOffset }] }]}>
            <Text style={styles.versePrefix}>قال الله تعالى</Text>
            <Text style={styles.verse}>﴿ وَنَزَّلْنَا عَلَيْكَ الْكِتَابَ تِبْيَانًا لِّكُلِّ شَيْءٍ ﴾</Text>
          </Animated.View>
          <Animated.View style={[styles.textItem, { opacity: homeOpacity, transform: [{ translateY: homeOffset }] }]}>
            <Text style={styles.homeText}>
              حلقتك أصبحت في <Text style={styles.homeAccent}>بيتك</Text>
            </Text>
            <View style={styles.homeLine} />
          </Animated.View>
        </View>

        <View style={styles.dots}>
          {[0, 1, 2].map((dot) => (
            <View key={dot} style={[styles.dot, dot === 0 || dot === 1 ? styles.dotOn : null]} />
          ))}
        </View>
        <View style={styles.loader}>
          <Animated.View style={[styles.loaderFill, {
            transform: [{ translateX: loaderX.interpolate({ inputRange: [0, 1], outputRange: [-loaderTravel, loaderTravel] }) }],
          }]} />
        </View>
        <Text style={styles.tagline}>TIBYAN</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: palette.maroon,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  halo: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: `${palette.gold}18`,
    opacity: 0.9,
    transform: [{ scale: 1.12 }],
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 34,
  },
  logo: { width: "100%", height: 190 },
  shine: {
    position: "absolute",
    width: 34,
    height: 230,
    backgroundColor: `${palette.cream}28`,
    transform: [{ rotate: "18deg" }, { translateX: 130 }],
  },
  textStage: {
    width: "100%",
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  textItem: {
    position: "absolute",
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  versePrefix: {
    color: "#E6D5B8",
    fontFamily: "IBMPlexSansArabic_400Regular",
    fontSize: 15,
    marginBottom: 8,
    textAlign: "center",
  },
  verse: {
    color: palette.gold,
    fontFamily: "Amiri_700Bold",
    fontSize: 22,
    lineHeight: 39,
    textAlign: "center",
  },
  homeText: {
    color: palette.cream,
    fontFamily: "IBMPlexSansArabic_400Regular",
    fontSize: 24,
    textAlign: "center",
  },
  homeAccent: { color: palette.goldLight, fontFamily: "IBMPlexSansArabic_700Bold" },
  homeLine: { width: 120, height: 2, borderRadius: 2, backgroundColor: palette.gold, marginTop: 14 },
  dots: { position: "absolute", bottom: 96, flexDirection: "row", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: "#E6D5B840" },
  dotOn: { backgroundColor: palette.gold, shadowColor: palette.gold, shadowOpacity: 0.8, shadowRadius: 8 },
  loader: { position: "absolute", bottom: 56, width: 140, height: 2, borderRadius: 4, backgroundColor: "#FFFFFF1F", overflow: "hidden" },
  loaderFill: { width: 56, height: 2, backgroundColor: palette.gold },
  tagline: { position: "absolute", bottom: 22, color: "#E6D5B873", fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, letterSpacing: 2 },
});