import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { splashColors } from "../../constants/splash";
import { createIOSExitGate, iosSplashLogoFrame, iosSplashMotion } from "../../lib/ios-splash-lifecycle";

type Props = {
  active: boolean;
  fadeLogoFirst: boolean;
  ready: boolean;
  onPrepared: () => void;
  onFinish: () => void;
  onFailure: () => void;
};

/** iOS only: a single full-window layer matching the native launch screen. */
export default function IOSSplash({ active, ready, fadeLogoFirst, onPrepared, onFinish, onFailure }: Props) {
  const { width } = useWindowDimensions();
  const frame = iosSplashLogoFrame(width);
  const opacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(iosSplashMotion.initialScale)).current;
  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const reduced = useRef(true);
  const callbacks = useRef({ onFinish, onFailure, fadeLogoFirst });
  callbacks.current = { onFinish, onFailure, fadeLogoFirst };
  const gate = useRef<ReturnType<typeof createIOSExitGate> | null>(null);

  useEffect(() => {
    let alive = true;
    const apply = (value: boolean) => {
      if (!alive) return;
      reduced.current = value;
      setReducedMotion(value);
      if (value) {
        scale.stopAnimation();
        scale.setValue(1);
        // Also handle enabling Reduce Motion midway through the entrance.
        if (gate.current) {
          logoOpacity.stopAnimation();
          logoOpacity.setValue(1);
        }
      }
      gate.current?.setReducedMotion(value);
    };
    const timeout = setTimeout(() => apply(true), iosSplashMotion.preferenceTimeout);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", apply);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { clearTimeout(timeout); apply(value); })
      .catch(() => { clearTimeout(timeout); apply(true); });
    return () => {
      alive = false;
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [logoOpacity, scale]);

  useEffect(() => {
    if (laidOut && imageReady && reducedMotion !== null) onPrepared();
  }, [imageReady, laidOut, onPrepared, reducedMotion]);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const running: Animated.CompositeAnimation[] = [];
    opacity.setValue(1);
    logoOpacity.setValue(0);
    scale.setValue(reduced.current ? 1 : iosSplashMotion.initialScale);
    const entrance = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: reduced.current ? iosSplashMotion.reducedFade : iosSplashMotion.logoFade,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...(!reduced.current ? [Animated.timing(scale, {
        toValue: 1,
        duration: iosSplashMotion.logoScale,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })] : []),
    ]);
    running.push(entrance);
    entrance.start();
    const exitGate = createIOSExitGate(() => {
      const layerFade = Animated.timing(opacity, {
        toValue: 0,
        duration: reduced.current ? iosSplashMotion.reducedFade : iosSplashMotion.exitFade,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      // Welcome has a smaller, higher logo. Use an intentional dissolve, not a teleport.
      const exit = callbacks.current.fadeLogoFirst ? Animated.sequence([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: iosSplashMotion.reducedFade,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        layerFade,
      ]) : layerFade;
      running.push(exit);
      exit.start(({ finished }) => {
        if (alive && finished) callbacks.current.onFinish();
      });
    }, reduced.current);
    gate.current = exitGate;
    return () => {
      alive = false;
      exitGate.dispose();
      gate.current = null;
      running.forEach((animation) => animation.stop());
    };
  }, [active, logoOpacity, opacity, scale]);

  useEffect(() => {
    if (active) gate.current?.setReady(ready);
  }, [active, ready]);

  return (
    <Animated.View
      style={[styles.root, { opacity }]}
      onLayout={(_: LayoutChangeEvent) => setLaidOut(true)}
      accessibilityLabel="تبيان — جارٍ بدء التطبيق"
      accessibilityViewIsModal
    >
      <Animated.Image
        source={require("../../assets/images/logo-splash.png")}
        resizeMode="contain"
        onLoad={() => setImageReady(true)}
        onError={() => callbacks.current.onFailure()}
        style={[frame, { opacity: logoOpacity, transform: [{ scale }] }]}
        accessibilityLabel="تبيان"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: splashColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
