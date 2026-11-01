import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

export type KeyboardFrame = {
  /** Space the keyboard takes at the bottom of the screen, 0 while hidden. */
  height: number;
  /** Window y of the keyboard's top edge. */
  top: number;
};

const HIDDEN: KeyboardFrame = { height: 0, top: 0 };

/**
 * Where the on-screen keyboard is. Android draws the app edge to edge, so the
 * window no longer shrinks for the keyboard and screens make room themselves.
 */
export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState(HIDDEN);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subscriptions = [
      Keyboard.addListener(show, ({ endCoordinates }) => setFrame({
        // Android reports the keyboard without the navigation bar below it.
        height: Math.max(endCoordinates.height, Dimensions.get("screen").height - endCoordinates.screenY),
        top: endCoordinates.screenY,
      })),
      Keyboard.addListener(hide, () => setFrame(HIDDEN)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  return frame;
}
