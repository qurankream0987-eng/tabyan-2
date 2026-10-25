# Tabyan Build 6 — App Store Metadata Audit

**Audit date:** 2026-10-02
**Scope:** metadata visible in source/configuration plus external URL probes.

**iOS feature-scope assumption:** The submitted iOS app uses Tabyan's own
phone/email-and-password account setup and sign-in. Google sign-in and the
Mushaf entry/promotion are excluded from iOS; Android and Web retain their
existing features. App Store copy and screenshots must describe only the iOS
experience, even where shared Web metadata mentions additional features.

## Decision

```text
TASK_143: BLOCKED
SUPPORT_URL: ENVIRONMENT_BLOCKED
PRIVACY_POLICY_URL: ENVIRONMENT_BLOCKED
MARKETING_URL: NOT_CONFIGURED
SCREENSHOTS_MATCH_BUILD6: MANUAL_REVIEW_REQUIRED
APP_PRIVACY_READY: MANUAL_ACTION_REQUIRED
```

The native configuration supplies support and privacy URL values, but the
current Replit environment could not resolve `tibyanquran.com`. This is an
environment limitation, not proof that the production site is down. The URLs
must be rechecked from a real external network before submission.

## Audited values

| Item | Observed value/status | Result |
|---|---|---|
| App name | `تبيان` in Expo config; Web title uses `تبيان | منصة قرآنية لتعلّم القرآن الكريم` | Manual App Store confirmation |
| Subtitle | Not found in inspected source | Manual action |
| Description | Web metadata describes Quran learning, memorization/recitation tracking, Mushaf, and student/teacher/supervisor paths | App Store description must not promote Mushaf or Google sign-in on iOS |
| Promotional text | Not found | Manual action |
| Keywords | Not found | Manual action |
| Support URL | `https://tibyanquran.com/support` in Expo extra | Environment-blocked |
| Privacy Policy URL | `https://tibyanquran.com/privacy` in Expo extra | Environment-blocked |
| Marketing URL | Not configured in `app.json`/`eas.json` | Not configured |
| Age rating | Not found | Manual App Store action |
| Category | Not found | Manual App Store action |
| Screenshots | No verified App Store screenshot set found in inspected source | Manual review required |
| App Privacy | Not found in repository/config | Manual action required |
| Review contact | Not found | Manual App Store action |
| Review notes | Draft prepared separately | Placeholder completion required |

## URL checks

The following probes were attempted:

- `https://tibyanquran.com`
- `https://tibyanquran.com/support`
- `https://tibyanquran.com/privacy`
- `https://tibyanquran.com/api/healthz`

Result from this environment:

```text
DNS: ENVIRONMENT_BLOCKED
HTTPS: ENVIRONMENT_BLOCKED
PRODUCTION_WEB: UNVERIFIED
PRODUCTION_API_HEALTH: UNVERIFIED
```

## Screenshot requirements

No PASS is claimed because a final App Store screenshot set was not available
for inspection. Before submission, confirm every screenshot:

- comes from the actual Build 6 experience;
- contains no personal data, test credentials, tokens, or private dashboard
  data;
- does not show a feature hidden or disabled in Build 6;
- matches the final Arabic name, navigation, and visual identity;
- does not imply payments or subscriptions if none are shipped.

## Required manual action

Complete App Store Connect metadata and externally verify all URLs. Then
replace the placeholders in
`docs/APPLE_BUILD6_APP_REVIEW_NOTES_FINAL_DRAFT.md` with verified values only.

## Guideline 4.8 — Login services

Apple's current [App Review Guidelines, section 4.8](https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple)
requires an equivalent login service when an app uses a third-party/social
login to set up or authenticate a user's primary account, subject to listed
exceptions. Apple lists an exception for apps that exclusively use their own
account setup and sign-in systems. With Google sign-in excluded from iOS and
the first-party password flows retained, this scope is consistent with that
exception; it is not a guarantee of App Review approval. Reconfirm against the
final iOS binary and current guideline before submission.