import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** UI-thread feedback only; actions still fire through the original onPress. */
export function SoftPressable({ style, onPressIn, onPressOut, ...props }: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) {
  const pressed = useSharedValue(0);
  const feedback = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.12,
    transform: [{ scale: 1 - pressed.value * 0.015 }],
  }));
  return <AnimatedPressable accessibilityRole="button" {...props} style={[feedback, style]}
    onPressIn={(event) => {
      pressed.value = withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System });
      onPressIn?.(event);
    }}
    onPressOut={(event) => {
      pressed.value = withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System });
      onPressOut?.(event);
    }}
  />;
}
