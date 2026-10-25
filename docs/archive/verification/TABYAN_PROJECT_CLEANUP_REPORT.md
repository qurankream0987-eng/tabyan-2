# Tabyan project forensic cleanup report

Audit date: 2026-09-24 (UTC). Repository: `/home/runner/workspace`.

## 1. Executive summary

Audit completed before cleanup. Only ignored TypeScript incremental metadata is approved for deletion. No source, dependency, branding asset, screenshot, database file, publishing setting, cache store, Git/LFS object, or active build output is approved for removal. This is intentionally a small cleanup, not a repository-size reduction campaign.

The major findings are stale verification paths, an unsafe displaced post-merge schema-push script, a historical seed-password exposure, retained build output, duplicated platform assets, and many UI template components with no static incoming imports. These are recorded, not automatically changed.

The current auth/logo work is **uncommitted**, rather than part of HEAD. It is protected exactly like the other existing user work. All six requested protected commits are ancestors of HEAD. The four newer recitation/mushaf commits at the top of history are also preserved.

## 2. Repository map

| Directory / area | Purpose | Active | Generated | Source of truth | Safe to clean | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| artifacts/mobile | Expo Router native app and Expo Go production contract | Yes | Source + local outputs | app/, components/, lib/, app.json, scripts/ | Only listed compiler cache | High |
| artifacts/tabyan | Vite/React Web app; Quran public assets | Yes | Source + dist | src/ and public/ | Only listed compiler cache | High |
| artifacts/api-server | HTTP/storage/video/recitation provider server | Yes | Source + dist | src/, build.mjs | Only listed compiler cache | High |
| artifacts/mockup-sandbox | Separate design preview app and UI templates | Workspace member | Source + cache | src/, package.json | Compiler cache only; app requires confirmation | Medium |
| lib/tabyan-trpc | Shared API router, auth/business logic, recitation helpers | Yes | Source + declarations | src/ | Compiler cache only | Critical |
| lib/db | Drizzle schema, migrations, SQL/data generation and seed tools | Yes | Source + declarations | src/, migrations/ | Compiler cache only | Critical |
| lib/design-tokens | Canonical neutral brand/theme token JSON | Yes | Source | tokens.json | No | High |
| lib/tabyan-domain | Product/navigation registry | Yes | Source | product-registry.json | No | High |
| lib/api-spec | OpenAPI definition and Orval generator | Tooling | Source | API spec + orval.config.ts | No | Medium |
| lib/api-client-react; lib/api-zod | Generated checked-in API adapters and source exports | Yes | Generated source + declarations | Orval spec/config and custom fetch adapters | Compiler cache only; generated source retained | High |
| verification | Historical evidence, manifests, displaced verification scripts | Yes / paths stale | Mixed | Reviewed manifests/reports/scripts | Listed compiler cache only | High |
| scripts/ | Referenced by root scripts/workspace and .replit, but absent | Broken references | N/A | Files now under verification/scripts | Do not recreate post-merge path | Critical |
| artifacts/*/scripts; mobile/server | Local build, token and native asset tools; Expo serving | Yes | Source | Each script and package entry | No | High |
| assets / public | Native images and Web Quran/font/image assets; no root assets directory | Yes | Mixed reviewed content | Platform source paths | No source-asset deletion | Critical |
| screenshots | 71 tracked historical visual evidence files | Evidence | Captured images | Git history and associated reports | Confirmation only | Medium |
| docs; root markdown | Historical decisions, release identity and verification evidence | Evidence | Authored / captured | Git history | Preserve; do not assume obsolete | High |
| generated/tabyan-qr.png | Small QR artifact with historical references | Uncertain | Generated but tracked | Generator/history unclear | No | Medium |
| dist; static-build; .expo | Build/runtime outputs and Expo local state/types | Yes / mixed age | Yes | Build scripts and original source | Protected outputs retained | High |
| node_modules; .cache; .local/share; .config/npm; .pythonlibs | Installed tooling/dependencies and caches | Yes / mixed | Yes | Manifests/registries/tooling | No automatic purge; offline regeneration not proven | High |
| .local/state; .agents; .config | Workspace/tool state, credentials/preferences, agent evidence | Yes / unknown | Mixed | Local owners | No | High |
| .git incl. objects and lfs | History, index, protected commits and LFS media | Yes | Git-managed | Git | No pruning/history rewrite | Critical |
| tests | Colocated Web/tRPC/API tests; synthetic video fixtures created in temporary dirs | Yes | Source + temporary output | *.test.ts files | No fixture/source deletion | High |
| root and artifact config | Workspace, bundlers, Expo/EAS, Replit, TypeScript, env examples | Yes / some stale paths | Source | Respective config | No publishing or identity changes | Critical |


## 3. Dirty working tree analysis

CURRENT_HEAD: `3324f320529276debcf0031fb16272b8b66bff48`

CURRENT_BRANCH: `claude/friendly-faraday-mg2jbq`

Baseline: 21 modified tracked files, 5 untracked files, 0 staged files. SHA-256 fingerprints of all baseline dirty/untracked files were captured before cleanup.

| File | Git state | Classification | Action |
| --- | --- | --- | --- |
| `.replit` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/api-server/src/lib/videoStructure.test.ts` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/api-server/src/lib/videoStructure.ts` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/api-server/src/lib/videoUploadPolicy.test.ts` | untracked | USER_WORK | Preserve byte-for-byte |
| `artifacts/api-server/src/lib/videoUploadPolicy.ts` | untracked | USER_WORK | Preserve byte-for-byte |
| `artifacts/api-server/src/routes/storage.ts` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app.json` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app/(auth)/login.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app/(auth)/register.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app/(auth)/teacher-register.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app/admin/users.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app/student/placement.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/app/teacher/onboarding.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/components/branded-splash.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/components/ui.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/lib/native-recording.ts` | untracked | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/lib/theme.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/mobile/package.json` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/tabyan/scripts/recitation-audio-benchmark.ts` | untracked | USER_WORK | Preserve byte-for-byte |
| `artifacts/tabyan/src/App.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/tabyan/src/components/admin/ReviewVideoPlayer.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/tabyan/src/components/app/PhoneField.tsx` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/tabyan/src/components/app/SplashScreen.css` | modified | USER_WORK | Preserve byte-for-byte |
| `artifacts/tabyan/src/index.css` | modified | USER_WORK | Preserve byte-for-byte |
| `pnpm-lock.yaml` | modified | USER_WORK | Preserve byte-for-byte |
| `verification/tabyan-brand-auth-audit.md` | untracked | USER_WORK | Preserve byte-for-byte |

No baseline dirty file is TASK_RELATED, GENERATED, TEMPORARY, or UNKNOWN for this cleanup. The new report is TASK_RELATED. Ignored compiler metadata is GENERATED and inventoried separately.

| Protected commit | Ancestor of baseline HEAD |
| --- | --- |
| db8f112966935e10d7833b81067da42e73021d7d | YES |
| b6e1772a33fe2f26cbca9b439ee93f97483dce77 | YES |
| 39e57d6 | YES |
| d017994 | YES |
| 9bd65cc | YES |
| a0d884f | YES |


## 4. Large file analysis

Largest tracked working-tree files (logical sizes; tracked content total 282,006,611 bytes (268.94 MiB)). Large Quran files are required even when no literal filename appears in source.

| File | Size | Classification | Decision |
| --- | --- | --- | --- |
| `artifacts/tabyan/public/logo.png` | 774,726 bytes (0.74 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/tabyan/public/logo-transparent.png` | 774,726 bytes (0.74 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/tabyan/public/logo-light.png` | 742,914 bytes (0.71 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/mobile/assets/images/logo-light.png` | 742,914 bytes (0.71 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/tabyan/public/logo-splash.png` | 534,938 bytes (0.51 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/mobile/assets/images/logo-gold.png` | 534,127 bytes (0.51 MiB) | MEDIA / REQUIRED brand | Preserve |
| `pnpm-lock.yaml` | 497,261 bytes (0.47 MiB) | REQUIRED / historical evidence | Preserve |
| `artifacts/tabyan/public/logo-dark.png` | 437,571 bytes (0.42 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/mobile/assets/images/logo-dark.png` | 437,571 bytes (0.42 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/mobile/assets/images/logo-splash-gold.png` | 430,136 bytes (0.41 MiB) | MEDIA / REQUIRED brand | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p521.ttf` | 397,292 bytes (0.38 MiB) | REQUIRED Quran | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p559.ttf` | 393,964 bytes (0.38 MiB) | REQUIRED Quran | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p379.ttf` | 393,692 bytes (0.38 MiB) | REQUIRED Quran | Preserve |
| `artifacts/mobile/assets/images/icon.png` | 393,493 bytes (0.38 MiB) | MEDIA / REQUIRED brand | Preserve |
| `docs/REPLIT_APP_STORE_LAUNCH_SUPPORT_EVIDENCE.md` | 393,472 bytes (0.38 MiB) | REQUIRED / historical evidence | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p569.ttf` | 385,112 bytes (0.37 MiB) | REQUIRED Quran | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p565.ttf` | 382,580 bytes (0.36 MiB) | REQUIRED Quran | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p433.ttf` | 377,340 bytes (0.36 MiB) | REQUIRED Quran | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p567.ttf` | 377,040 bytes (0.36 MiB) | REQUIRED Quran | Preserve |
| `artifacts/tabyan/public/mushaf/fonts-ttf/p579.ttf` | 375,908 bytes (0.36 MiB) | REQUIRED Quran | Preserve |


Largest untracked/ignored physical files found outside installed dependency and Git internals (metadata only; no contents printed):

| File | Size | Classification | Decision |
| --- | --- | --- | --- |
| `.local/share/pnpm/store/v10/files/12/8f18c9930f6fe187cd769adbaf935cffabf61e1c634a589668a4cda2afcaccd2f744410c32f3e3a004fe8e30fd5dad084aed7aa6695a46f6a7fc6da6d193f4-exec` | 79,826,272 bytes (76.13 MiB) | GENERATED tooling/cache | Preserve |
| `artifacts/api-server/dist/bin/ffprobe` | 64,541,160 bytes (61.55 MiB) | GENERATED runtime | Preserve |
| `.local/share/pnpm/store/v10/files/0e/1d12830a1e40c709e53e9c7245df0f6a1422bf5f6edc06184b4f31d11564e348d4bdab3b4a40b697e605a06241289cdbaafeea8564fbebdee5b52f4604dbc4-exec` | 30,137,501 bytes (28.74 MiB) | GENERATED tooling/cache | Preserve |
| `.cache/ffmpeg-static-nodejs/b548bbc59bad3f2acf27feb15f26d63a1df15dc063785859f94a592d57d3b7876a671044aa0aa2beb2fccd26231490a0d01e1297e2f1d5695b06b9f64593ce13.body` | 29,354,986 bytes (28.00 MiB) | GENERATED tooling/cache | Preserve |
| `artifacts/api-server/dist/index.mjs.map` | 11,834,583 bytes (11.29 MiB) | GENERATED runtime | Preserve |
| `.local/state/replit/durableptc/f2bb12fd-b1c2-46fc-8de9-a024b5f6b133/wasmSnapshot-eb57955896e8f5ff6daf83edbb2d1cda6c9efdfed926103ffe03b8af10eb1daf.bin` | 9,557,073 bytes (9.11 MiB) | UNKNOWN workspace state | Preserve |
| `.local/state/replit/durableptc/f2bb12fd-b1c2-46fc-8de9-a024b5f6b133/wasmSnapshot-7716a6aeb2f5334e77f34817d5f58df597cdaacf65d4e6db76e313e884a87dec.bin` | 9,557,073 bytes (9.11 MiB) | UNKNOWN workspace state | Preserve |
| `.cache/pnpm/metadata-ff-v1.3/package-firewall.replit.internal/typescript.json` | 9,297,614 bytes (8.87 MiB) | GENERATED tooling/cache | Preserve |
| `.cache/pnpm/metadata-ff-v1.3/package-firewall.replit.local/typescript.json` | 9,255,552 bytes (8.83 MiB) | GENERATED tooling/cache | Preserve |
| `.cache/pnpm/metadata-ff-v1.3/package-firewall.replit.internal/react-native.json` | 7,678,073 bytes (7.32 MiB) | GENERATED tooling/cache | Preserve |
| `.cache/pnpm/metadata-ff-v1.3/package-firewall.replit.local/react-native.json` | 7,653,488 bytes (7.30 MiB) | GENERATED tooling/cache | Preserve |
| `artifacts/api-server/dist/index.mjs` | 6,760,258 bytes (6.45 MiB) | GENERATED runtime | Preserve |


Largest directory allocations at baseline: node_modules 1,411,219,456 bytes; .git 1,063,448,576 bytes (including 546,459,648 LFS bytes); .cache 774,787,072 bytes; artifacts 704,286,720 bytes; .local 313,958,400 bytes; .config 237,613,056 bytes. Dependency stores/hardlinks can make per-directory totals non-additive. No Git/LFS cleanup is justified merely by size.

## 5. Generated output analysis

| Output | Logical size | Regeneratable | Tracked | Required/source status | Local / Git deletion |
| --- | --- | --- | --- | --- | --- |
| artifacts/tabyan/dist | 273,654,364 bytes (260.98 MiB) | Vite build | No | Runtime output; contains copied Quran assets | No / N/A |
| artifacts/api-server/dist | 84,302,097 bytes (80.40 MiB) | API build | No | Runtime output incl. ffprobe and Riva protos | No / N/A |
| artifacts/mobile/static-build | 28,165,020 bytes (26.86 MiB) | Mobile build.js | No | Production Expo Go manifests/bundles/assets consumed by server/serve.js | No / N/A |
| artifacts/mobile/dist | 13,199,188 bytes (12.59 MiB) | Expo Web export | No | 56 export files; existing preflight explicitly protects dist | Confirmation / N/A |
| lib/*/dist | 634,512 bytes (0.61 MiB) | TypeScript build | No | Declaration outputs support project references | No / N/A |
| artifacts/mobile/.expo | 30,425 bytes (0.03 MiB) | Expo tooling | No | Current route types and Metro/workspace state | No / N/A |
| 10 TypeScript incremental metadata files | 1,517,098 bytes (1.45 MiB) | TypeScript compiler | No | Performance metadata only; not source or runtime input | YES / N/A |
| lib/api-client-react/src/generated; lib/api-zod/src/generated | See source tree | Orval | Yes | REQUIRED_SOURCE exported by packages | No / No |
| Quran JSON/fonts and token copy | See asset audit | Reviewed conversion/sync | Yes | REQUIRED_SOURCE; dynamic loading and native Metro boundary | No / No |

No tracked dist/static-build/.expo/tsbuildinfo files were found. No coverage/test-results/browser-report directories were found in the project inventory. Browser screenshots and Metro exports from the previous auth task are in `/tmp`, outside this workspace and referenced by its report; they are preserved.

## 6. Asset duplication analysis

Exact SHA-256/size comparison found 15 duplicate groups. All original branding, app icons, splash images and Quran assets are protected. Cross-platform copies are intentional because native Metro and Web public serving have different roots. “No literal reference” is not deletion proof.


| FILE | SIZE bytes | REFERENCED_BY | DUPLICATE_OF | SAFE_TO_DELETE | Group |
| --- | --- | --- | --- | --- | --- |
| `artifacts/tabyan/public/logo.png` | 774726 | `artifacts/tabyan/src/components/app/AdminGateModal.tsx`, `artifacts/tabyan/src/components/app/StudentAuthModal.tsx`, `artifacts/tabyan/src/components/app/TeacherRegisterFlow.tsx`, `artifacts/tabyan/src/components/app/StudentRegisterFlow.tsx` | `artifacts/tabyan/public/logo-transparent.png` | NO | C |
| `artifacts/tabyan/public/logo-transparent.png` | 774726 | `docs/TABYAN_NATIVE_MOBILE_V2_WEB_INVENTORY.md` | `artifacts/tabyan/public/logo.png` | NO | C |
| `artifacts/tabyan/public/logo-light.png` | 742914 | `artifacts/tabyan/index.html`, `artifacts/mobile/components/ui.tsx`, `docs/TABYAN_NATIVE_MOBILE_V2_WEB_INVENTORY.md`, `verification/tabyan-brand-auth-audit.md` | `artifacts/mobile/assets/images/logo-light.png` | NO | C |
| `artifacts/mobile/assets/images/logo-light.png` | 742914 | `artifacts/tabyan/index.html`, `artifacts/mobile/components/ui.tsx`, `docs/TABYAN_NATIVE_MOBILE_V2_WEB_INVENTORY.md`, `verification/tabyan-brand-auth-audit.md` | `artifacts/tabyan/public/logo-light.png` | NO | C |
| `artifacts/tabyan/public/logo-dark.png` | 437571 | `artifacts/mobile/components/ui.tsx`, `docs/TABYAN_NATIVE_MOBILE_V2_WEB_INVENTORY.md` | `artifacts/mobile/assets/images/logo-dark.png` | NO | C |
| `artifacts/mobile/assets/images/logo-dark.png` | 437571 | `artifacts/mobile/components/ui.tsx`, `docs/TABYAN_NATIVE_MOBILE_V2_WEB_INVENTORY.md` | `artifacts/tabyan/public/logo-dark.png` | NO | C |
| `attached_assets/image_1789442403394.png` | 302771 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1789445808301.png` | UNKNOWN | B |
| `attached_assets/image_1789445808301.png` | 302771 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1789442403394.png` | UNKNOWN | B |
| `attached_assets/image_1787297630357.png` | 284363 | No literal reference found; historical/dynamic use not excluded | `attached_assets/0_18e81bfe-9256-4ff2-8647-9d54771f5839_1787310370548.png` | UNKNOWN | B |
| `attached_assets/0_18e81bfe-9256-4ff2-8647-9d54771f5839_1787310370548.png` | 284363 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1787297630357.png` | UNKNOWN | B |
| `attached_assets/image_1786904102832.png` | 123680 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1786907799152.png` | UNKNOWN | B |
| `attached_assets/image_1786907799152.png` | 123680 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1786904102832.png` | UNKNOWN | B |
| `screenshots/mushaf-reader-dark-after-audit.jpg` | 70321 | No literal reference found; historical/dynamic use not excluded | `screenshots/mushaf-reader-dark-final.jpg` | UNKNOWN | B |
| `screenshots/mushaf-reader-dark-final.jpg` | 70321 | No literal reference found; historical/dynamic use not excluded | `screenshots/mushaf-reader-dark-after-audit.jpg` | UNKNOWN | B |
| `attached_assets/image_1787731051192.png` | 68603 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1787731331912.png` | UNKNOWN | B |
| `attached_assets/image_1787731331912.png` | 68603 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1787731051192.png` | UNKNOWN | B |
| `attached_assets/d31ab9bf-3bad-460a-a99e-94dd6270526e_1789387936616.jpg` | 62988 | No literal reference found; historical/dynamic use not excluded | `attached_assets/d31ab9bf-3bad-460a-a99e-94dd6270526e_1789387941407.jpg` | UNKNOWN | B |
| `attached_assets/d31ab9bf-3bad-460a-a99e-94dd6270526e_1789387941407.jpg` | 62988 | No literal reference found; historical/dynamic use not excluded | `attached_assets/d31ab9bf-3bad-460a-a99e-94dd6270526e_1789387936616.jpg` | UNKNOWN | B |
| `screenshots/tabyan-mobile-current.jpg` | 24312 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-step2-mobile-root.jpg` | UNKNOWN | B |
| `screenshots/tabyan-step2-mobile-root.jpg` | 24312 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-current.jpg` | UNKNOWN | B |
| `screenshots/tabyan-step2-mobile-login.jpg` | 24312 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-current.jpg` | UNKNOWN | B |
| `attached_assets/mobile-register-type-picker.jpg` | 22699 | No literal reference found; historical/dynamic use not excluded | `attached_assets/mobile-register-step1.jpg` | UNKNOWN | B |
| `attached_assets/mobile-register-step1.jpg` | 22699 | No literal reference found; historical/dynamic use not excluded | `attached_assets/mobile-register-type-picker.jpg` | UNKNOWN | B |
| `attached_assets/mobile-register-final.jpg` | 22699 | No literal reference found; historical/dynamic use not excluded | `attached_assets/mobile-register-type-picker.jpg` | UNKNOWN | B |
| `attached_assets/image_1788736892158.png` | 30274 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1788736937956.png` | UNKNOWN | B |
| `attached_assets/image_1788736937956.png` | 30274 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1788736892158.png` | UNKNOWN | B |
| `attached_assets/image_1789946607875.png` | 27896 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1789946923173.png` | UNKNOWN | B |
| `attached_assets/image_1789946923173.png` | 27896 | No literal reference found; historical/dynamic use not excluded | `attached_assets/image_1789946607875.png` | UNKNOWN | B |
| `screenshots/tabyan-mobile-v2-verified.jpg` | 20107 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-v2-device-completion-preview.jpg` | UNKNOWN | B |
| `screenshots/tabyan-mobile-v2-device-completion-preview.jpg` | 20107 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-v2-verified.jpg` | UNKNOWN | B |
| `screenshots/tabyan-mobile-v2-preview-final.jpg` | 2903 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-v2-login.jpg` | UNKNOWN | B |
| `screenshots/tabyan-mobile-v2-login.jpg` | 2903 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-v2-preview-final.jpg` | UNKNOWN | B |
| `screenshots/tabyan-mobile-v2-login-final.jpg` | 2903 | No literal reference found; historical/dynamic use not excluded | `screenshots/tabyan-mobile-v2-preview-final.jpg` | UNKNOWN | B |


Additional no-literal-reference candidates: `artifacts/tabyan/public/logo-light.jpg` (212,073 bytes), `qr-tabyan.png` (5,855 bytes), `qr-tabyan-v2.png` (6,654 bytes): branding/QR assets, Group C, SAFE_TO_DELETE NO. Public URLs may be used outside source imports. `generated/tabyan-qr.png` (1,463 bytes) is tracked and retained, Group C.

Dynamic Quran resolution is proven by `artifacts/tabyan/src/lib/mushaf/fonts.ts` (`fonts/p${page}.woff2`) and native sync/verification scripts. The 603 WOFF2 and 603 TTF files lacking individual literal references are false unused candidates, Group C; page 1 is directly referenced. All 604-page Quran datasets and fonts are preserved. No video fixture or font source was removed. Native `require(...)`, app.json icon/splash references, filesystem routing and platform extensions were considered.

All 71 tracked screenshots remain. Exact duplicate screenshot rows above are Group B; all other historical screenshots are Group C. Duplicate uploaded attachments listed above are Group B; other uploaded user artifacts are Group C. No image editing or asset deduplication was applied.

## 7. Dependency analysis

All 13 repository package manifests were parsed; seven additional local tooling/template manifests were inventoried but are not application packages. Installed third-party manifests are dependency internals, not removal candidates. No dependency or lockfile change was made. Literal import absence is only a heuristic: peer dependencies, compiler types, autolinking, Expo plugins, runtime loaders and CLI use matter.


| PACKAGE | LOCATION | WHY_SUSPECTED | REFERENCES_FOUND | SAFE_TO_REMOVE |
| --- | --- | --- | --- | --- |
| @replit/connectors-sdk | package.json | No application import found; workspace service tooling may use it | Tooling references; no application import | UNKNOWN |
| cookie-parser | artifacts/api-server/package.json | No direct source import found | No local literal import | UNKNOWN |
| google-auth-library | artifacts/api-server/package.json | No direct source import found | Google storage auth/transitive runtime context | UNKNOWN |
| @hookform/resolvers | artifacts/tabyan/package.json; artifacts/mockup-sandbox/package.json | No local literal import | Form ecosystem present; future/template ownership unclear | UNKNOWN |
| date-fns | artifacts/tabyan/package.json; artifacts/mockup-sandbox/package.json | No local literal import | Calendar/date-picker ecosystem present | UNKNOWN |
| react-icons | artifacts/tabyan/package.json | No local literal import | Other icon libraries used | UNKNOWN |
| drizzle-zod | lib/db/package.json | No schema use found by text scan | Drizzle schema tooling | UNKNOWN |
| zod | lib/db/package.json | No local literal reference | Schema tooling and workspace contracts | UNKNOWN |
| framer-motion | artifacts/mockup-sandbox/package.json | No local literal import | Used in main Web app; mockup ownership unknown | UNKNOWN |
| tailwindcss-animate | artifacts/mockup-sandbox/package.json | No local literal import | CSS/toolchain may consume plugin | UNKNOWN |
| zod | artifacts/tabyan/package.json; artifacts/mockup-sandbox/package.json | No local literal import | Validation/tooling peer ecosystem | UNKNOWN |

All entries above: Group B, confirmation plus isolated dependency-removal tests required. These are 11 package names / 15 manifest placements, not 11 proven unused packages.

False positives preserved (Group C): @types/* (compiler), @babel/runtime and @expo/metro-runtime (transforms), expo-linking/expo-updates (Expo/config), react-dom/react-native-screens/react-native-worklets (platform/peer/autolinking), @expo/ngrok (CLI), thread-stream/pino-pretty (Pino worker bundling), @workspace/design-tokens (canonical package relationship), TypeScript. The dirty native recording package and lockfile are USER_WORK, not accidental dependencies.

Version differences: native @types/react ~19.1.17 vs Web catalog ^19.2.0; @trpc/server ^11.18.0 in API vs ^11.8.1 in shared router; Expo module peer `*` vs native concrete range; mockup/main Web Radix/date-picker/form/chart range differences. These are ranges/peer contracts, not proof of runtime incompatibility. No versions were changed. Web runtime libraries are predominantly under devDependencies because Vite bundles them at build time; moving them could change installation/deployment behavior and is not cleanup-safe.

## 8. Script audit

| Manifest | Script | Missing target | Classification |
| --- | --- | --- | --- |
| package.json | verify:contracts | scripts/verify-contract-baseline.mjs | B; repair separately after reviewing relocated script assumptions |
| package.json | verify:design-tokens | scripts/verify-design-tokens.mjs | B; repair separately after reviewing relocated script assumptions |
| package.json | verify:product-registry | scripts/verify-product-registry.mjs | B; repair separately after reviewing relocated script assumptions |
| package.json | verify:home-navigation-parity | scripts/verify-home-navigation-parity.mjs | B; repair separately after reviewing relocated script assumptions |
| package.json | verify:screen-parity | scripts/verify-screen-parity.mjs | B; repair separately after reviewing relocated script assumptions |
| package.json | app-store:preflight | scripts/app-store-preflight-cleanup.mjs | B; repair separately after reviewing relocated script assumptions |
| package.json | verify:mushaf | scripts/verify-mushaf.mjs | B; repair separately after reviewing relocated script assumptions |

The root build calls the missing `verify:mushaf` target. `pnpm-workspace.yaml` and root typecheck also refer to absent `scripts/`; `verification/scripts` is outside those workspace patterns. Several moved verifier scripts compute repository root as one parent of their file, now resolving to `verification/`, and `verification/scripts/tsconfig.json` extends absent `verification/tsconfig.base.json`. Merely fixing entry paths is insufficient. Existing relative-path defects are documented without enabling automation. Mobile `dev` and `dev:android-proxy` are duplicate aliases; preserve CLI compatibility.

Dangerous / mutation-capable scripts (Group C, not executed):

| File / entry | Side effect | Action |
| --- | --- | --- |
| .replit postMerge → missing scripts/post-merge.sh; displaced verification/scripts/post-merge.sh | Installs dependencies then invokes db push | DO NOT reconnect or run |
| lib/db/package.json push / push-force | Drizzle schema push; force option | DO NOT run |
| lib/db/seed-tabyan.mjs | Database seed/content/account/settings writes | DO NOT run |
| lib/db/gen-sharia-demo.mjs | DB/content-generation tooling; ownership and effects protected | DO NOT run |
| verification/scripts/app-store-preflight-cleanup.mjs --clean-safe | Recursive removal of .cache, coverage, logs and tmp; stale root assumptions | DO NOT run |
| artifacts/mobile/scripts/sync-mushaf-assets.mjs | Deletes native Quran destinations before copying | DO NOT run |
| verification/scripts/download-mushaf.mjs; download-quran-word-text.mjs; build-mushaf-manifest.mjs | Downloads/rewrites Quran data or reviewed manifests | DO NOT run |
| package.json preinstall | Removes alternate lockfiles before validating package manager | No install performed |
| .replit deployment.postBuild | pnpm store prune affects shared package cache | No deployment or prune performed |

Build output refreshes are separate from cleanup: Vite and Mobile builds are requested verification, run locally only. Existing mobile static-build output will be backed up and restored after verification. No root aggregate build, DB script, EAS command, Apple tooling, or post-merge hook is run.

## 9. Config audit

All repository package.json files, app.json and eas.json parse without duplicate keys. `.replit` parses as TOML. TypeScript/Vite/Metro configs retain current behavior. No repository ESLint config or env-example candidate was found by the filename scan; no environment values were printed. The native token JSON is byte-identical to the canonical token JSON and is explicitly required by the Metro adapter; no consolidation is safe here. Legacy palette constants still exist, but color refactoring is outside this cleanup.

Git hygiene: root ignore rules cover build output, compiler metadata, local env/credentials, dependencies and local state. Native dist is explicitly ignored; nested static-build iOS/Android paths are currently ignored via unanchored `ios/`/`android/` rules. A dedicated `/static-build/` native ignore rule would express intent more clearly, but was not changed because current paths are already covered and publishing behavior is protected. `.config/` is excluded by `/etc/.gitignore`, a machine-level rather than repository-level rule; consider an explicit credential/tool-state rule in a separate review. `.gitattributes` retains historical LFS archive mappings; removing them could affect history/recovery semantics. `.replitignore` describes deployed-image filtering; it is not assumed to control App Store upload archives. All ignore/publishing/app identity files remain untouched.

## 10. Dead code candidates

TypeScript AST/import resolution inspected 530 tracked JS/TS source/config files; no unresolved relative/module-alias imports were found by that pass. This does not prove every public string path exists or every export is used. 99 files had no static incoming import before resolving filesystem/CLI/service-worker/platform conventions. Expo routes, API entry points, test files and obvious configuration/CLI entry files were excluded from deletion candidates.


| File | Bytes | Group | Evidence / disposition |
| --- | --- | --- | --- |
| `artifacts/mockup-sandbox/src/components/ui/scroll-area.tsx` | 1642 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/sonner.tsx` | 894 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/table.tsx` | 2859 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/empty.tsx` | 2396 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/badge.tsx` | 1163 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/spinner.tsx` | 331 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/switch.tsx` | 1148 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/kbd.tsx` | 862 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/alert-dialog.tsx` | 4419 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/popover.tsx` | 1342 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/collapsible.tsx` | 329 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/menubar.tsx` | 8608 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/drawer.tsx` | 3007 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/toaster.tsx` | 772 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/progress.tsx` | 792 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/checkbox.tsx` | 1031 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/input-otp.tsx` | 2143 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/alert.tsx` | 1598 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/toggle-group.tsx` | 1753 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/context-menu.tsx` | 7406 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/radio-group.tsx` | 1410 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/hover-card.tsx` | 1237 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/form.tsx` | 4175 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/calendar.tsx` | 7569 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/chart.tsx` | 10674 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/select.tsx` | 5745 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/navigation-menu.tsx` | 5124 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/avatar.tsx` | 1419 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/dropdown-menu.tsx` | 7606 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/card.tsx` | 1828 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/resizable.tsx` | 1723 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/accordion.tsx` | 2001 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/field.tsx` | 6044 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/item.tsx` | 4494 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/aspect-ratio.tsx` | 140 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/sidebar.tsx` | 21056 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/pagination.tsx` | 2751 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/command.tsx` | 4887 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/slider.tsx` | 1037 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/input-group.tsx` | 4883 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/tabs.tsx` | 1877 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/breadcrumb.tsx` | 2712 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/carousel.tsx` | 6210 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/mockup-sandbox/src/components/ui/button-group.tsx` | 2209 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/public/sw.js` | 601 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/tabyan/src/components/AudioPlayerBar.tsx` | 86 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/tabyan/src/components/RecordingBanner.tsx` | 88 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/tabyan/src/components/app/IslamicBg.tsx` | 2044 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/app/StudentAuthModal.tsx` | 2378 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/tabyan/src/components/app/VideoTimer.tsx` | 3104 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/tabyan/src/components/app/OtpInput.tsx` | 1553 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/tabyan/src/components/ui/accordion.tsx` | 2013 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/alert.tsx` | 1609 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/aspect-ratio.tsx` | 143 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/avatar.tsx` | 1431 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/badge.tsx` | 1528 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/breadcrumb.tsx` | 2735 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/card.tsx` | 1856 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/carousel.tsx` | 6288 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/chart.tsx` | 10846 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/checkbox.tsx` | 1038 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/collapsible.tsx` | 335 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/command.tsx` | 4918 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/empty.tsx` | 2410 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/field.tsx` | 6079 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/form.tsx` | 4232 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/hover-card.tsx` | 1245 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/input-group.tsx` | 4993 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/item.tsx` | 4519 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/kbd.tsx` | 867 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/menubar.tsx` | 8655 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/navigation-menu.tsx` | 5150 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/pagination.tsx` | 2772 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/progress.tsx` | 799 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/radio-group.tsx` | 1421 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/resizable.tsx` | 1733 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/scroll-area.tsx` | 1650 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/sidebar.tsx` | 21969 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/slider.tsx` | 1043 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/sonner.tsx` | 902 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/spinner.tsx` | 334 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/table.tsx` | 2881 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/tabs.tsx` | 1890 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/toggle-group.tsx` | 1767 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/button-group.tsx` | 2241 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/calendar.tsx` | 7647 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/alert-dialog.tsx` | 4495 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/drawer.tsx` | 3077 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/popover.tsx` | 1396 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/select.tsx` | 5776 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/dropdown-menu.tsx` | 7676 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/ui/context-menu.tsx` | 7506 | B | No incoming static import; template/export or historical use remains possible |
| `artifacts/tabyan/src/components/recitation/RecitationFlow.tsx` | 14034 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/mobile/components/student-session-call.web.tsx` | 716 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/mobile/components/teacher-session-call.web.tsx` | 718 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/mobile/components/admin-session-monitor.native.tsx` | 18143 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `artifacts/mobile/lib/native-recitation.ts` | 16860 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `lib/db/gen-sharia-demo.mjs` | 4951 | C | Protected domain or dynamic/platform/CLI entry; no deletion |
| `lib/db/seed-tabyan.mjs` | 37975 | C | Protected domain or dynamic/platform/CLI entry; no deletion |

The service worker is registered by URL in `prayer-notifications.ts`; .web/.native files are platform resolution inputs. Native recitation, RecitationFlow, auth/OTP screens, media wrappers/VideoTimer, database tools and untracked benchmark/recording work remain protected even if static imports are absent. No unused import/local/constant or commented code removal was attempted; such edits would offer negligible benefit while touching protected features.

## 11. Secret/log safety findings

Current scan: 6478 files. Reachable-history scan: 6281 blobs from all available refs. Credential values were never printed, stored in the audit artifacts, or copied into this report. No history rewrite occurred.

| FILE | CATEGORY |
| --- | --- |
| lib/db/seed-tabyan.mjs (Git history) | Historical hardcoded seed-password literal; validity/reuse not checked |

SECRET_EXPOSURE_FOUND: YES (historical seed credential). Current seed code uses `MASTER_HASH` from the environment; it was not run. Have the owner determine whether the historical credential was ever used and rotate it if still relevant. Do not automatically rewrite Git history.

Current heuristic matches were reviewed as false positives: localized UI labels (including escaped Unicode in bundles), test fixtures, and a library PEM header marker without key material. No confirmed live API token/private key/signed URL was found in the scanned current text. This is not a guarantee of absence: binary screenshots, archive contents, Git LFS historical payloads, files/blobs over 8 MB, dependency internals, ignored tool-state histories and environment values were not fully content-scanned. Historical screenshots and copied diagnostic docs may contain user-visible information and must remain access-controlled pending owner review. No raw user data, auth headers, Apple credentials, 2FA values, or private/signed URLs are reproduced here.

## 12. Cleanup candidates by risk

Each candidate has one group. Explicit per-file rows above take precedence over broad directory descriptions.

### Group A — SAFE_NOW

Only the following ten ignored TypeScript incremental cache files. Each is valid compiler metadata, absent from the Git index, not among baseline dirty/untracked files, and governed by incremental/composite TypeScript config. No runtime loader references them. Missing metadata causes recomputation; source and declaration outputs are retained. Each deletion must recheck its fingerprint and ignored/untracked status.

| File | Bytes | SAFE_TO_DELETE | Regeneration |
| --- | --- | --- | --- |
| `tsconfig.tsbuildinfo` | 456 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `artifacts/mockup-sandbox/.tsbuildinfo` | 235936 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `artifacts/api-server/.tsbuildinfo` | 202637 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `artifacts/tabyan/tsconfig.tsbuildinfo` | 288478 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `artifacts/mobile/tsconfig.tsbuildinfo` | 405951 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `lib/api-client-react/tsconfig.tsbuildinfo` | 15453 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `lib/api-zod/tsconfig.tsbuildinfo` | 16137 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `lib/db/tsconfig.tsbuildinfo` | 130319 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `lib/tabyan-trpc/tsconfig.tsbuildinfo` | 178450 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |
| `verification/scripts/tsconfig.tsbuildinfo` | 43281 | YES | TypeScript incremental/project build (verification package cache may remain absent until its stale config is repaired) |

Candidate logical total: 1,517,098 bytes (1.45 MiB). Tests may regenerate some caches, so net savings will be smaller. Temporary outputs created by this audit’s verification are disposable only after validation and preservation/restoration of baseline artifacts.

### Group B — SAFE_AFTER_CONFIRMATION

Exact duplicate screenshots/uploads listed in section 6; the 11 dependency names in section 7; non-protected no-incoming-import rows in section 10; displaced non-mutating verifier path repairs from section 8; the unused Expo Web export only after owner confirmation because existing tooling marks dist protected. None applied.

### Group C — DO_NOT_TOUCH

All baseline user work, auth/authorization/API/business logic, video/AI/recitation code, filesystem routes/platform variants, all brand/icon/splash/QR assets, Quran/QCF/fonts/data, source token copies, database/schema/migrations/seeds, dangerous automation, publishing/Apple/EAS/Replit identity, runtime/generated source contracts, active build outputs, Git/LFS history, dependency/tool stores and unknown historical evidence. Nonduplicate screenshot/upload/doc evidence stays here. No unknown file is automatically upgraded to Group A.

## 13. Files actually removed

PENDING: cleanup has not yet run. The approved manifest is the exact ten-file list in section 12; no wildcard deletion will be used.

## 14. Files intentionally preserved

All 3,211 originally tracked files; all 26 existing dirty/untracked files; all assets and source code; 71 screenshots; generated API source and declaration outputs; active Web/API/Native runtime outputs; .expo route state; installed dependencies/caches; .git history/LFS; publishing/identity configuration. No source/style normalization or dependency removal is justified for this task. The original outputs used by Mobile production serving will be restored after its local verification build.

## 15. Size before/after

Baseline allocated workspace size (`du -sx -B1 .`): **4,572,418,048 bytes (4.2584 GiB)**, including dependencies, ignored output, Git and tooling state. Baseline tracked logical size: **282,006,611 bytes**. Per-directory baseline allocations are in section 4. Final size and retained cache savings will be recorded after tests. The report itself adds bytes; compilation/tool caches can grow independently. No claim that local deletion shrinks Git history, LFS, deployment images, or App Store archives is made.

## 16. Tests/checks run

PENDING after the audited Group A deletion: Mobile/Web/API TypeScript, Web/API tests, Web production build, Mobile production build, iOS/Android Metro exports, and git diff --check. API tests will use an unreachable localhost database URL to prevent production access. No DB migration/seed/push is part of verification.

## 17. Failures/blockers

The default command sandbox cannot establish socket mount isolation; commands use the approved external execution path. No user work was changed to work around this. Pre-existing verifier/workspace/tsconfig path defects are reported in section 8 and deliberately not repaired. Real device acceptance from the prior auth task remains separate from this cleanup. Final check failures, if any, will be recorded here and only cleanup-caused failures will be reverted.

## 18. Recommended next actions

1. Review the historical seed credential with the owner; rotate if relevant without exposing it or rewriting history automatically.
2. Repair read-only verification paths and workspace membership in a separate scoped task, explicitly excluding post-merge DB push and mutation-capable preflight/sync scripts.
3. Decide which historical screenshots/uploads must remain as evidence before considering deduplication.
4. Review dependency/UI-template candidates individually with ownership and platform/peer checks; static import absence is not enough.
5. Plan any substantial Git/LFS/store/build-output size reduction separately with recovery guarantees. Existing dist output and native contract are protected.
6. Complete native-device auth keyboard acceptance from the previous task.

No push, deploy, publication, production data access/change, database schema change, auth/video/AI/Quran behavior change, or publishing identity/config change is authorized or performed by this cleanup.
