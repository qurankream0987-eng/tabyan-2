import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Svg,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { splashColors, splashLayout, splashTiming } from "../../constants/splash";

const goldLogo = require("../../assets/images/logo-splash.png");

type Props = {
  active: boolean;
  onFinish: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

function radialGradientId() {
  return "tabyan-splash-halo";
}

export default function TabyanSplash({ active, onFinish, onLayout }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeDriver = Platform.OS !== "web";
  const logoWidth = Math.min(
    Platform.OS === "web" ? splashLayout.logoWidth : splashLayout.nativeLogoWidth,
    width * splashLayout.logoWidthRatio,
  );
  const logoHeight = logoWidth / splashLayout.logoAspectRatio;
  const verseFontSize = width < 350
    ? Math.max(18, Math.min(22.4, 19.8 + ((width - 320) / 30) * 2.6))
    : Math.max(22.4, Math.min(30.4, width * 0.045));
  const initialLogoOffset = Platform.OS === "web" ? 0 : splashLayout.nativeLogoVerticalOffset;

  const logoOpacity = useRef(new Animated.Value(Platform.OS === "web" ? 0 : 1)).current;
  const logoOffset = useRef(new Animated.Value(initialLogoOffset)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(Platform.OS === "web" ? 0.8 : 0)).current;
  const chromeOpacity = useRef(new Animated.Value(Platform.OS === "web" ? 1 : 0)).current;
  const innerOpacity = useRef(new Animated.Value(1)).current;
  const shineOpacity = useRef(new Animated.Value(0)).current;
  const shineX = useRef(new Animated.Value(0)).current;
  const loaderX = useRef(new Animated.Value(-67)).current;
  const dotValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const verseOpacity = useRef(new Animated.Value(0)).current;
  const verseY = useRef(new Animated.Value(24)).current;
  const verseScale = useRef(new Animated.Value(0.96)).current;
  const homeOpacity = useRef(new Animated.Value(0)).current;
  const homeY = useRef(new Animated.Value(24)).current;
  const homeScale = useRef(new Animated.Value(0.96)).current;
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const running: Animated.CompositeAnimation[] = [];
    const keep = (animation: Animated.CompositeAnimation) => {
      running.push(animation);
      animation.start();
    };
    const schedule = (delay: number, callback: () => void) => {
      timers.push(setTimeout(callback, delay));
    };
    const inOut = Easing.bezier(0.22, 1, 0.36, 1);
    const easeInOut = Easing.inOut(Easing.ease);

    const haloLoop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(haloScale, {
          toValue: 1.12,
          duration: splashTiming.haloHalfCycle,
          easing: easeInOut,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: splashTiming.haloHalfCycle,
          easing: easeInOut,
          useNativeDriver: nativeDriver,
        }),
      ]),
      Animated.parallel([
        Animated.timing(haloScale, {
          toValue: 1,
          duration: splashTiming.haloHalfCycle,
          easing: easeInOut,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0.8,
          duration: splashTiming.haloHalfCycle,
          easing: easeInOut,
          useNativeDriver: nativeDriver,
        }),
      ]),
    ]));
    keep(haloLoop);

    const logoIntroParts: Animated.CompositeAnimation[] = [
      Animated.timing(logoOffset, {
        toValue: 0,
        duration: splashTiming.logoDuration,
        delay: splashTiming.logoDelay,
        easing: inOut,
        useNativeDriver: nativeDriver,
      }),
    ];
    if (Platform.OS === "web") {
      logoIntroParts.push(Animated.timing(logoOpacity, {
        toValue: 1,
        duration: splashTiming.logoDuration,
        delay: splashTiming.logoDelay,
        easing: inOut,
        useNativeDriver: nativeDriver,
      }));
    }
    keep(Animated.parallel(logoIntroParts));

    if (Platform.OS !== "web") {
      keep(Animated.timing(haloOpacity, {
        toValue: 0.8,
        duration: 220,
        useNativeDriver: nativeDriver,
      }));
      keep(Animated.timing(chromeOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: nativeDriver,
      }));
    }

    const loaderLoop = Animated.loop(Animated.timing(loaderX, {
      toValue: 213,
      duration: splashTiming.loaderCycle,
      easing: easeInOut,
      useNativeDriver: nativeDriver,
    }));
    keep(loaderLoop);

    const animateText = (
      opacity: Animated.Value,
      translateY: Animated.Value,
      scale: Animated.Value,
      toOpacity: number,
      toY: number,
      toScale: number,
    ) => keep(Animated.parallel([
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: 700,
        easing: inOut,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: toY,
        duration: 700,
        easing: inOut,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(scale, {
        toValue: toScale,
        duration: 700,
        easing: inOut,
        useNativeDriver: nativeDriver,
      }),
    ]));

    schedule(splashTiming.dots[0], () => keep(Animated.timing(dotValues[0], {
      toValue: 1, duration: 400, easing: easeInOut, useNativeDriver: nativeDriver,
    })));
    schedule(splashTiming.verseIn, () => {
      animateText(verseOpacity, verseY, verseScale, 1, 0, 1);
      keep(Animated.timing(dotValues[1], {
        toValue: 1, duration: 400, easing: easeInOut, useNativeDriver: nativeDriver,
      }));
    });
    schedule(splashTiming.verseOut, () => {
      animateText(verseOpacity, verseY, verseScale, 0, -24, 0.96);
      keep(Animated.timing(dotValues[2], {
        toValue: 1, duration: 400, easing: easeInOut, useNativeDriver: nativeDriver,
      }));
    });
    schedule(splashTiming.homeIn, () => animateText(homeOpacity, homeY, homeScale, 1, 0, 1));

    const shineLoop = Animated.loop(Animated.parallel([
      Animated.timing(shineX, {
        toValue: logoWidth * 2,
        duration: splashTiming.shineCycle,
        easing: easeInOut,
        useNativeDriver: nativeDriver,
      }),
      Animated.sequence([
        Animated.timing(shineOpacity, {
          toValue: 1,
          duration: splashTiming.shineCycle * 0.15,
          useNativeDriver: nativeDriver,
        }),
        Animated.delay(splashTiming.shineCycle * 0.7),
        Animated.timing(shineOpacity, {
          toValue: 0,
          duration: splashTiming.shineCycle * 0.15,
          useNativeDriver: nativeDriver,
        }),
      ]),
    ]));
    schedule(splashTiming.shineDelay, () => keep(shineLoop));

    schedule(splashTiming.logoFloatDelay, () => {
      const floatLoop = Animated.loop(Animated.sequence([
        Animated.timing(logoOffset, {
          toValue: -9,
          duration: 2500,
          easing: easeInOut,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(logoOffset, {
          toValue: 0,
          duration: 2500,
          easing: easeInOut,
          useNativeDriver: nativeDriver,
        }),
      ]));
      keep(floatLoop);
    });

    schedule(splashTiming.fadeStart, () => keep(Animated.parallel([
      Animated.timing(innerOpacity, {
        toValue: 0,
        duration: splashTiming.fadeDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: nativeDriver,
      }),
    ])));
    schedule(splashTiming.total, onFinish);

    return () => {
      timers.forEach(clearTimeout);
      running.forEach((animation) => animation.stop());
    };
  }, [
    active,
    chromeOpacity,
    dotValues,
    haloOpacity,
    haloScale,
    homeOpacity,
    homeScale,
    homeY,
    innerOpacity,
    loaderX,
    logoOffset,
    logoOpacity,
    logoWidth,
    nativeDriver,
    onFinish,
    shineOpacity,
    shineX,
    verseOpacity,
    verseScale,
    verseY,
  ]);

  const bottomDots = splashLayout.bottomDots + insets.bottom;
  const bottomLoader = splashLayout.bottomLoader + insets.bottom;
  const bottomTagline = splashLayout.bottomTagline + insets.bottom;
  const logoFrameStyle = {
    width: logoWidth,
    height: logoHeight,
    marginBottom: splashLayout.logoBottomGap,
    borderRadius: 0,
    backgroundColor: "transparent",
  } as const;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Animated.View
        style={[
          styles.halo,
          { opacity: haloOpacity, transform: [{ scale: haloScale }] },
        ]}
      >
        <Svg width={splashLayout.haloSize} height={splashLayout.haloSize} viewBox="0 0 560 560">
          <Defs>
            <RadialGradient id={radialGradientId()} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={splashColors.gold} stopOpacity={0.14} />
              <Stop offset="45%" stopColor={splashColors.gold} stopOpacity={0.04} />
              <Stop offset="70%" stopColor={splashColors.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="280" cy="280" r="280" fill={`url(#${radialGradientId()})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.inner,
          { opacity: innerOpacity },
        ]}
      >
        <Animated.View
          style={[
            styles.logoWrapper,
            logoFrameStyle,
            { transform: [{ translateY: logoOffset }] },
          ]}
        >
          <Image source={goldLogo} resizeMode="contain" style={styles.logoImage} />
          <View
            pointerEvents="none"
            style={[
              styles.shineClip,
              {
                borderRadius: 0,
                width: logoWidth,
                height: logoHeight,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.shineBand,
                {
                  width: logoWidth * 0.4,
                  height: logoHeight * 1.8,
                  top: -logoHeight * 0.4,
                  left: -logoWidth * 0.6,
                  opacity: shineOpacity,
                  transform: [{ translateX: shineX }],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient
                    id="tabyan-splash-logo-shine"
                    x1="0%"
                    y1="100%"
                    x2="100%"
                    y2="0%"
                  >
                    <Stop offset="0%" stopColor={splashColors.shineColor} stopOpacity={0} />
                    <Stop
                      offset="50%"
                      stopColor={splashColors.shineColor}
                      stopOpacity={splashColors.shineOpacity}
                    />
                    <Stop offset="100%" stopColor={splashColors.shineColor} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect width="100" height="100" fill="url(#tabyan-splash-logo-shine)" />
              </Svg>
            </Animated.View>
          </View>
        </Animated.View>

        <View style={styles.textStage}>
          <Animated.View
            style={[
              styles.textItem,
              {
                opacity: verseOpacity,
                transform: [{ translateY: verseY }, { scale: verseScale }],
              },
            ]}
          >
            <Text style={styles.versePrefix}>قال الله تعالى</Text>
            <Text
              style={[
                styles.verseText,
                { fontSize: verseFontSize, lineHeight: Math.round(verseFontSize * 1.7) },
              ]}
            >
              ﴿ وَنَزَّلْنَا عَلَيْكَ الْكِتَابَ تِبْيَانًا لِّكُلِّ شَيْءٍ ﴾
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.textItem,
              {
                opacity: homeOpacity,
                transform: [{ translateY: homeY }, { scale: homeScale }],
              },
            ]}
          >
            <Text numberOfLines={1} style={styles.homeText}>
              حلقتك أصبحت في{" "}
              <Text style={styles.homeTextGold}>بيتك</Text>
            </Text>
            <Svg width={120} height={2} style={styles.homeUnderline} viewBox="0 0 120 2">
              <Defs>
                <LinearGradient id="tabyan-splash-home-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={splashColors.gold} stopOpacity={0} />
                  <Stop offset="50%" stopColor={splashColors.gold} stopOpacity={1} />
                  <Stop offset="100%" stopColor={splashColors.gold} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="120" height="2" rx="1" fill="url(#tabyan-splash-home-line)" />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.dots,
            { bottom: bottomDots, opacity: chromeOpacity },
          ]}
        >
          {dotValues.map((dot, index) => (
            <View key={index} style={styles.dot}>
              <Animated.View
                style={[
                  styles.dotActive,
                  {
                    opacity: dot,
                    transform: [{
                      scale: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }),
                    }],
                  },
                ]}
              />
            </View>
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.loader,
            { bottom: bottomLoader, opacity: chromeOpacity },
          ]}
        >
          <Animated.View
            style={[
              styles.loaderLight,
              { transform: [{ translateX: loaderX }] },
            ]}
          >
            <Svg width={56} height={2} viewBox="0 0 56 2">
              <Defs>
                <LinearGradient id="tabyan-splash-loader" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={splashColors.gold} stopOpacity={0} />
                  <Stop offset="50%" stopColor={splashColors.gold} stopOpacity={1} />
                  <Stop offset="100%" stopColor={splashColors.gold} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="56" height="2" rx="1" fill="url(#tabyan-splash-loader)" />
            </Svg>
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.tagline,
            { bottom: bottomTagline, opacity: chromeOpacity },
          ]}
        >
          <Text style={styles.taglineText}>TIBYAN</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: splashColors.background,
  },
  halo: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: splashLayout.haloSize,
    height: splashLayout.haloSize,
    marginLeft: -splashLayout.haloSize / 2,
    marginTop: -splashLayout.haloSize / 2,
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  shineClip: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
  },
  shineBand: {
    position: "absolute",
  },
  textStage: {
    position: "relative",
    width: "100%",
    minHeight: splashLayout.textStageHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  textItem: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  versePrefix: {
    marginBottom: 14,
    color: splashColors.warmText,
    fontFamily: "IBMPlexSansArabic_400Regular",
    fontSize: 16.8,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  verseText: {
    maxWidth: "100%",
    color: splashColors.gold,
    fontFamily: "Amiri_700Bold",
    lineHeight: 38,
    textAlign: "center",
    writingDirection: "rtl",
  },
  homeText: {
    color: splashColors.homeText,
    fontFamily: "IBMPlexSansArabic_400Regular",
    fontSize: 24,
    letterSpacing: 0.5,
    textAlign: "center",
    writingDirection: "rtl",
  },
  homeTextGold: {
    color: splashColors.gold,
    fontFamily: "IBMPlexSansArabic_700Bold",
  },
  homeUnderline: {
    alignSelf: "center",
    marginTop: 16,
  },
  dots: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    zIndex: 2,
  },
  dot: {
    width: 7,
    height: 7,
    overflow: "visible",
    borderRadius: 4,
    backgroundColor: splashColors.dotOff,
  },
  dotActive: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: splashColors.gold,
    shadowColor: splashColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 3,
  },
  loader: {
    position: "absolute",
    alignSelf: "center",
    width: 140,
    height: 2,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: splashColors.loaderTrack,
    zIndex: 2,
  },
  loaderLight: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 56,
    height: 2,
  },
  tagline: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 2,
  },
  taglineText: {
    color: splashColors.tagline,
    fontFamily: "IBMPlexSansArabic_400Regular",
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 2,
    textAlign: "center",
  },
});