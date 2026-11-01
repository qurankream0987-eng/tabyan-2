const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Expo inlines EXPO_PUBLIC_* at transform time. Separate Metro's persisted
// transforms when the API target changes, so a preview cannot reuse a release
// fallback compiled before the development origin was configured.
config.cacheVersion = `${config.cacheVersion ?? "1"}:api-origin:${process.env.EXPO_PUBLIC_DOMAIN ?? "release-default"}`;

// On Windows the React Native Gradle plugin passes the entry file relative to
// this app, but Metro resolves the entry against the workspace root (its fake
// origin is "<serverRoot>/."), so release builds miss expo-router/entry.
const upstreamResolveRequest = config.resolver.resolveRequest;
const FONT_CAP_MODULE = path.resolve(__dirname, "lib/platform/react-native-font-cap.js");
const APP_SOURCE_DIRS = ["app", "components", "lib", "constants"].map((dir) => path.resolve(__dirname, dir) + path.sep);
const isAppSource = (file) => APP_SOURCE_DIRS.some((dir) => file.startsWith(dir));
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  const fromEntryOrigin = /[\\/]\.$/.test(context.originModulePath);
  if (fromEntryOrigin && moduleName.startsWith(".")) {
    // Development servers pass a root-relative entry that already resolves; keep it then.
    try {
      return resolve(context, path.resolve(__dirname, moduleName), platform);
    } catch {
      return resolve(context, moduleName, platform);
    }
  }
  // App code imports "react-native" through a thin layer that caps system
  // font scaling (see lib/platform/react-native-font-cap.js); libraries and
  // that layer itself get the real module.
  if (moduleName === "react-native" && isAppSource(context.originModulePath) && context.originModulePath !== FONT_CAP_MODULE) {
    return resolve(context, FONT_CAP_MODULE, platform);
  }
  return resolve(context, moduleName, platform);
};
module.exports = config;
