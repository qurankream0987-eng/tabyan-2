const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Expo inlines EXPO_PUBLIC_* at transform time. Separate Metro's persisted
// transforms when the API target changes, so a preview cannot reuse a release
// fallback compiled before the development origin was configured.
config.cacheVersion = `${config.cacheVersion ?? "1"}:api-origin:${process.env.EXPO_PUBLIC_DOMAIN ?? "release-default"}`;
module.exports = config;