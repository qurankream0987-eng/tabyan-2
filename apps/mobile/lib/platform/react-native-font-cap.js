/**
 * The app's view of "react-native" (wired in metro.config.js): everything is
 * passed through unchanged, except that Text and TextInput cap how far the
 * system font size enlarges them. Screens are laid out for moderate scaling;
 * very large system sizes (common on Samsung) clipped fields and titles. A
 * component that passes its own maxFontSizeMultiplier keeps it.
 *
 * React Native exports most members as lazy getters, some of which warn when
 * read; the descriptors are copied so nothing is read until it is used.
 */
const React = require("react");
const ReactNative = require("react-native");

const MAX_FONT_SCALE = 1.15;

function capped(Base, name, statics) {
  const Capped = (props) => React.createElement(Base, { maxFontSizeMultiplier: MAX_FONT_SCALE, ...props });
  return Object.assign(Capped, statics, { displayName: name });
}

const overrides = {
  Text: capped(ReactNative.Text, "Text"),
  // TextInput carries statics (State, used to find the focused field).
  TextInput: capped(ReactNative.TextInput, "TextInput", ReactNative.TextInput),
  MAX_FONT_SCALE,
};

const exported = {};
for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(ReactNative))) {
  if (!(key in overrides)) Object.defineProperty(exported, key, { ...descriptor, configurable: true });
}
for (const [key, value] of Object.entries(overrides)) {
  Object.defineProperty(exported, key, { value, enumerable: true });
}

module.exports = exported;
