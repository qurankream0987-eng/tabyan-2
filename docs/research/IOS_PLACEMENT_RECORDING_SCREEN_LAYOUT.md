# Native iOS Placement recording layout

## Scope

Native iOS presentation only. No changes to recorder start/stop semantics, limits (45–300 seconds, five attempts), original-file track inspection, submission guards, backend, DB, main Web, or deployment.

## Changed presentation

- READY retains instructions, steps, live camera and start control.
- COUNTDOWN / STARTING / RECORDING / STOPPING / FINALIZING / VALIDATING use the dedicated iOS capture presentation.
- Capture hides the instruction/step cards, pre-record attempt description and rejection explanation; the header loses its subtitle.
- The camera fills remaining portrait content height instead of retaining a 3:4 card size. Scrolling is disabled during capture, and its position resets without changing the camera's ancestor component type.
- The recording HUD is 52 points high, positioned at the top. It shows the recording dot, current/max timer, minimum-duration status, and a small microphone icon.
- The microphone icon does **not** assert successful audio-track verification. Its accessibility description says the file's audio will be inspected after stop.
- The central 60% of camera height has no recording overlay. The large red status panel and persistent audio-check explanation were removed.
- A circular 76-point stop control and caption occupy a separate 104-point footer **below** the camera, with safe-area bottom padding.
- Finalizing shows only a top-edge saving notice with disabled controls; validating shows the existing file-inspection status and no Send controls yet.
- PREVIEW restores compact steps, duration, audio-inspection result and existing re-record/send controls. No recording HUD; no pre-record instruction prose.

## Continuity

The capture Card has a stable React key; CameraView remains at the same component-tree location while recording. The Screen remains a ScrollView, with scrolling disabled via a property rather than replacing it with a View. This avoids camera remounts caused by changing the presentation.

The shared Screen/StudentScreen additions are opt-in; the camera mode flag is only true for iOS Placement capture states. Other screens, Android and Web retain default presentation behavior.

## Verification limits

TypeScript: **PASS**. Focused placement suites: **42 tests PASS**, including 18 presentation-policy, static-structure and portrait layout-budget checks.

The size checks below are **local geometry checks**, not rendered-native screenshots or physical-device testing. They assume the existing 68-point header at normal text size. The flex layout reserves system top/bottom insets; the control footprint fits its footer.

| Portrait size | Camera budget | Top HUD bottom | Fit check |
|---|---:|---:|---|
| Small: 320×568, top 20 / bottom 0 | 360 points | 54 points (15%) | PASS locally |
| Standard: 390×844, top 47 / bottom 34 | 575 points | 54 points (<10%) | PASS locally |
| Pro Max: 430×932, top 59 / bottom 34 | 651 points | 54 points (<10%) | PASS locally |

The running Expo browser preview was captured, but it showed the startup/authentication surface. It does not verify this signed-in, iOS-only recording layout.

## Acceptance summary

| Requirement | Local source/geometry result |
|---|---|
| Pre-record instructions hidden during recording | PASS |
| Large center overlay removed | PASS |
| Compact timer HUD | PASS |
| Face-safe center preserved | PASS |
| Camera area expanded | PASS |
| Stop control below camera | PASS |
| Mic indicator compact and not a verification claim | PASS |
| Small iPhone | PASS for geometry only; native visual test PENDING |
| Standard iPhone | PASS for geometry only; native visual test PENDING |
| Pro Max | PASS for geometry only; native visual test PENDING |
| Real iPhone verified | **NO** |
| Deployment | **NO** |

**REAL_IPHONE_PENDING.** A newly built iOS app must still confirm actual layout, continuous capture through state changes, stop behavior, system text scaling and home-indicator clearance. The prior audiovisual-file fix's device acceptance also remains pending.

## Cost / operations

Only existing source/assets and focused local TypeScript/tests plus the running-preview screenshot were used. No paid build, external paid API, GPU, deployment, new paid service, dependency install, full build, full test suite or workflow restart was initiated. Actual Replit/Agent credit billing is not available here and is not asserted to be zero.
