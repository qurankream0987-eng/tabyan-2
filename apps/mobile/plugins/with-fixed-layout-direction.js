// Screens lay out right-to-left by hand, so Android must not mirror them when the
// device language is Arabic. React Native allows RTL on Android by default and
// reads the setting before the first screen, so it is turned off in onCreate.
const { withMainApplication } = require("expo/config-plugins");

const CALL = "com.facebook.react.modules.i18nmanager.I18nUtil.instance.allowRTL(this, false)";

module.exports = function withFixedLayoutDirection(config) {
  return withMainApplication(config, (mod) => {
    if (!mod.modResults.contents.includes(CALL)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /super\.onCreate\(\)\n/,
        (match) => `${match}    ${CALL}\n`,
      );
    }
    if (!mod.modResults.contents.includes(CALL)) {
      throw new Error("with-fixed-layout-direction: super.onCreate() not found in MainApplication");
    }
    return mod;
  });
};
