# TABYAN Smart Mushaf — Flutter and Expo Architecture Options

**Research date:** 2026-10-15  
**Recommendation:** Use a separate Flutter evaluation app/project backed by Tabyan’s existing backend. Do not embed it in, or replace, the current Expo app during evaluation.

Citation numbers are shared with the main ecosystem audit. Local workspace limits below are from project configuration and inspection.

## Decision context

Tabyan’s existing student app is Expo/React Native, while the audited Mushaf and Tasmee package is Flutter. Flutter supports embedding modules into native iOS and Android hosts, but its own documentation discusses loading order, memory, and multiple-engine implications. Expo supports custom native code through development builds; it does not document a turnkey Flutter module inside an Expo screen. Therefore “Flutter can add-to-app” is not the same as “this can be safely dropped into the current Expo app.” [[46]](https://docs.flutter.dev/add-to-app) [[47]](https://docs.flutter.dev/add-to-app/performance) [[48]](https://docs.expo.dev/workflow/customizing/) [[49]](https://docs.expo.dev/develop/development-builds/faq/)

The current Web Mushaf remains in the `artifacts/tabyan` web app; project memory and source inspection indicate there is no Mushaf reader in the existing Native app. The request is to evaluate a new candidate, not to restore the old Native reader or replace the Web reader. Preserve the current Web route and QCF v2 data. The candidate is a separate evaluation surface, and its data/auth must still come from Tabyan. [Local source: `artifacts/tabyan/src/App.tsx`; workspace rule: `.agents/memory/tabyan-mushaf-reader.md`]

This workspace already contains its one allowed mobile artifact for the student Expo app, and the environment has no Flutter or Dart SDK. The current Repl cannot safely produce a second mobile artifact in place. A separate Replit project or another approved Flutter host is required for a native candidate. The restriction is workspace-specific; Flutter and Expo documentation do not define Replit’s artifact allowance. [.agents/memory/tabyan-expo-artifact-limit.md; local `command -v flutter` and `command -v dart` inspection]

## Options compared

| Option | Reuse | Impact on current app | iPhone potential | Main risk | Decision |
|---|---|---|---|---|---|
| **A. Embed a Flutter module inside the existing Expo app** | Highest reuse of `quran_library` UI and Tasmee code | Medium-to-high: native host changes, lifecycle bridge, route integration, custom build configuration | Potentially strong after native-device validation | Two UI/runtime stacks, Expo native build complexity, startup/memory costs, native bridge and release maintenance | **Not first** |
| **B. Dedicated Flutter evaluation app/project using Tabyan services** | Highest practical reuse while preserving the current app | Lowest impact to current app; candidate can be deleted without changing the existing student app | Best route to measure Flutter directly on iPhone | Separate install/release; secure auth/session handoff must be designed; workspace artifact limit means it cannot be hosted here | **Recommended for evaluation** |
| **C. Port only the recognition engine into a React Native native module** | Low-to-medium; engine algorithms may be studied, but Flutter UI is discarded | Medium; adds native module(s) to Expo | Could fit a native RN shell if model/runtime bindings are compatible | Sherpa/model dependency and NPL rights remain; engine code may be coupled to Flutter; no evidence this is less work | **Not recommended before a separate benchmark** |
| **D. Move the student Mushaf experience to Flutter** | Highest long-term reuse | Highest migration risk; changes the user-facing product and default | Unknown until acceptance testing | Replaces a proven Web reader before legal, parity, and device gates; conflicts with “leave the old Mushaf untouched” during evaluation | **Deferred; not approved now** |

Flutter’s add-to-app model can be appropriate when a native host already exists and the module is a proven value-add. In this project, however, the host is Expo and the candidate itself has not passed a model, asset-rights, or device gate. Starting with Option A would put the integration cost before proof of the rendering and recitation experience. [[46]](https://docs.flutter.dev/add-to-app) [[47]](https://docs.flutter.dev/add-to-app/performance) [[48]](https://docs.expo.dev/workflow/customizing/)

Option B isolates the candidate and enables a fair iPhone comparison without modifying the present product. It should not create a second identity system or database. The candidate should obtain a short-lived, purpose-bound Tabyan session through a reviewed handoff, call the existing Tabyan backend, and return only allowed product outcomes. Apple Universal Links and Keychain access groups are possible platform mechanisms, but neither is an existing Tabyan token-sharing contract; design and test that contract explicitly. Android background service requirements should be considered only if background recitation becomes part of scope. [[50]](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app) [[51]](https://developer.apple.com/documentation/bundleresources/entitlements/keychain-access-groups) [[52]](https://developer.android.com/develop/background-work/services)

## Proposed candidate boundary

The candidate should contain only the Smart Mushaf surface, its reader interaction state, a provider adapter, and a narrow Tabyan API client. It should not contain the upstream parent app, third-party authentication, copied account records, a second database, or unreviewed Quran assets. The Tabyan server remains authoritative for identity, assigned learning range, session ownership, and persistence.

The adapter should accept a server-authorized session and an explicit session contract. It should emit evidence-backed observations such as recognized word span, skipped word, or uncertain result. “Uncertain” must stay silent rather than becoming a confident student error. Display state and provider evidence must remain separate. Do not alter the Quran text, normalize QCF glyph strings, or write candidate state into the current Web reader’s storage.

Use Tabyan branding and navigation around the library; do not reuse upstream app marks. Keep candidate fonts and text in an isolated, versioned asset package with their own clearance record. Do not copy current Tabyan QCF v2 files into Flutter or replace them with QPC V4 before rights and encoding are checked.

## Recommended staged path

1. **Resolve the hosting boundary.** Create a separate Flutter project/repl or select another approved native host. Do not repurpose the current Expo mobile artifact.
2. **Clear the assets and model.** Pin the package version; obtain rights for each exact font, text/layout file, recording, and model component. Exclude anything still unclear.
3. **Build a non-default candidate.** Reuse only approved `quran_library` code behind the Tabyan adapter. Keep auth, backend, and student records Tabyan-owned.
4. **Pass the iPhone gate first.** Test on the smallest supported iPhone and a current iPhone: rendering/glyph integrity, safe area, page interaction, session start/stop, audio interruptions, offline/permission cases, model download behavior, memory, battery, startup, crash recovery, and account isolation. Record app size, cold-start time, memory, recognition latency, and battery under a defined script; do not invent acceptance thresholds after seeing the results.
5. **Consider Android later.** Use a separate Android device gate after the iPhone experience is accepted.
6. **Only then consider replacement.** Compare the candidate against the unchanged Web Mushaf and obtain explicit approval before changing any default, route, or current reader.

## Recommendation

Choose **Option B** for a real native candidate. It best balances reuse, minimum impact, direct iPhone testing, and product isolation. Do not implement it in this workspace until a separate project/host is chosen: only one mobile artifact is available here, and Flutter/Dart are not installed. A web-only prototype in this workspace can preview visual direction but cannot establish native performance or iPhone viability.

The recommendation is **ADOPT_WITH_ADAPTER** at the code-architecture level, not unconditional adoption of every asset or model. The current model’s NPL restriction and unresolved Quran asset rights remain release blockers; see the License Matrix report.

## Sources

46. [Flutter add-to-app guide](https://docs.flutter.dev/add-to-app) — Fetched 2026-10-15; publication date not stated; Tier 1; saved evidence: research/smart-mushaf/sources/flutter-add-to-app.md
47. [Flutter add-to-app performance, load sequence, and memory](https://docs.flutter.dev/add-to-app/performance) — Fetched 2026-10-15; publication date not stated; Tier 1; saved evidence: research/smart-mushaf/sources/flutter-add-to-app-performance.md
48. [Expo: add custom native code](https://docs.expo.dev/workflow/customizing/) — Fetched 2026-10-15; publication date not stated; Tier 1; saved evidence: research/smart-mushaf/sources/expo-custom-native.md
49. [Expo development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/expo-development-builds-snippets.md
50. [Apple: supporting universal links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/apple-universal-links-snippets.md
51. [Apple Keychain Access Groups entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/keychain-access-groups) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/apple-keychain-groups-snippets.md
52. [Android background services overview](https://developer.android.com/develop/background-work/services) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/android-services-snippets.md
