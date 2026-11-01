// Lets `gradlew assembleRelease` run from any Windows shell (PowerShell, cmd),
// not only from Git Bash, with nothing to set up first.
const { withGradleProperties, withProjectBuildGradle } = require("expo/config-plugins");

const MARKER = "// with-windows-android-build";
const BLOCK = String.raw`
// with-windows-android-build
subprojects { project ->
  // Expo reads NODE_ENV while writing app.config for the native build; without
  // it the task warns and skips the environment-specific .env files.
  project.tasks.matching { it.name == "createExpoConfig" }.configureEach { task ->
    task.environment("NODE_ENV", System.getenv("NODE_ENV") ?: "production")
  }
  // react-native-audio-api starts Git's bash.exe directly, but its download
  // script also needs Git's mkdir, rm and curl, which PowerShell's PATH lacks.
  if (System.getProperty("os.name").toLowerCase().contains("windows")) {
    project.tasks.matching { it.name == "downloadPrebuiltBinaries" }.configureEach { task ->
      def git = "C:\\Program Files\\Git"
      // Windows names it "Path"; adding a second "PATH" leaves bash reading the old one.
      def key = task.environment.keySet().find { it.equalsIgnoreCase("PATH") } ?: "PATH"
      task.environment(key, git + "\\usr\\bin;" + git + "\\mingw64\\bin;" + task.environment[key])
    }
  }
}
`;

// 64-bit only: Google Play requires arm64, x86_64 covers the emulator, and the
// armeabi-v7a native paths of react-native-audio-api exceed Windows' 260-character limit.
const ARCHITECTURES = "arm64-v8a,x86_64";

module.exports = function withWindowsAndroidBuild(config) {
  config = withGradleProperties(config, (mod) => {
    const entry = mod.modResults.find((item) => item.type === "property" && item.key === "reactNativeArchitectures");
    if (entry) entry.value = ARCHITECTURES;
    else mod.modResults.push({ type: "property", key: "reactNativeArchitectures", value: ARCHITECTURES });
    return mod;
  });
  return withProjectBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;
    const start = contents.indexOf(MARKER);
    // Replace an earlier copy so changes here reach existing android/ folders.
    mod.modResults.contents = (start >= 0 ? contents.slice(0, start).trimEnd() + "\n" : contents) + BLOCK;
    return mod;
  });
};
