# iOS Registration Error Fix Report

**Date:** 2026-09-07 (Asia/Riyadh)  
**Scope:** Native registration validation and user-facing mobile error normalization  
**Release actions:** No iOS build, Apple upload, App Store submission, database migration, or production deployment was performed

## ROOT CAUSE

The confirmed defect had two connected causes:

1. The Native registration screen rendered `mutation.error.message` directly.
   tRPC/Zod may encode validation issues as a JSON string containing internal
   fields such as `code`, `maximum`, `inclusive`, `exact`, and `path`. The screen
   displayed that raw string without parsing or sanitizing it.
2. Native password validation did not match the canonical password contract.
   The canonical rule is now one non-whitespace character or more, with no
   letter, digit, case, special-character, or fixed-length requirement.

The phone field also sent only a trimmed value. Spaces, punctuation, Arabic
digits, and an international `00` prefix were not normalized before the API
request, even though the server expects Saudi legacy format or canonical E.164.

## FIX

- Added one Native error normalizer that:
  - Parses JSON-encoded Zod issue arrays/objects.
  - Extracts only human-readable Arabic messages.
  - Maps field paths to safe field-level messages.
  - Converts network failures into a clear Arabic connection message.
  - Hides stack traces, SQL/internal errors, tRPC/Zod internals, file paths, and
    raw validation metadata behind a safe fallback.
- Added Native registration validation matching the canonical one-character
  password contract.
- Added phone normalization for Arabic/Persian digits, spaces, parentheses,
  hyphens, and `00` international prefixes.
- Added field-level messages and error borders for name, phone, password, and
  password confirmation without changing the screen’s visual design.
- Changed the password hint to “one non-whitespace character or more”.
- Applied the normalizer to all audited Expo screens that directly exposed
  mutation/caught error messages.

## FILES CHANGED

- `artifacts/mobile/lib/user-facing-error.ts`
- `artifacts/mobile/lib/registration-validation.ts`
- `artifacts/mobile/app/(auth)/register.tsx`
- `artifacts/mobile/app/(auth)/login.tsx`
- `artifacts/mobile/app/student/settings.tsx`
- `artifacts/mobile/app/student/placement.tsx`
- `artifacts/mobile/app/student/tilawah.tsx`
- `artifacts/mobile/app/student/qibla.tsx`
- `artifacts/mobile/app/student/prayer-times.tsx`
- `artifacts/mobile/app/student/(tabs)/fatwa.tsx`
- `docs/IOS_REGISTRATION_ERROR_FIX_REPORT.md`

No Bundle ID, Expo project, Apple configuration, database schema,
authentication architecture, colors, or registration API contract changed.

## VALIDATION CONTRACT AUDIT

### Password

```text
PASSWORD VALIDATION CLIENT:
At least one non-whitespace character; the original password is preserved.

PASSWORD VALIDATION WEB:
At least one non-whitespace character; the original password is preserved.

PASSWORD VALIDATION SERVER:
At least one non-whitespace character; the original password is preserved.

MATCH: YES
```

### Phone

The Native screen has no separate country selector. It accepts the complete
international number in one field. The current server contract accepts:

- Saudi legacy format: `05` followed by eight digits.
- International E.164: `+` followed by 7–15 digits.
- Exact national lengths for the countries already defined in the server
  contract.
- General valid E.164 for other international dialing codes.

Native validation now mirrors those rules and normalizes user-friendly input
before sending it.

Tested pure validation cases:

| Case | Result |
|---|---|
| Valid Kuwait E.164 | PASS |
| Incomplete Kuwait number | PASS — rejected |
| Excess Kuwait digits | PASS — rejected |
| Arabic digits with spaces/hyphen and `00` prefix | PASS — normalized |
| E.164 containing spaces | PASS — normalized |
| Saudi legacy `05…` number | PASS |
| One-character password (`1`, `١`, `ا`, `A`, `@`) | PASS |
| Empty or whitespace-only password | PASS — rejected |
| Password with spaces around a non-whitespace character | PASS — original value preserved |

Changing a selected country is not applicable to the current Native form
because it does not contain a country selector. No registration field was added
or removed in this fix.

## GLOBAL MOBILE ERROR LEAK AUDIT

### RAW INTERNAL ERROR LEAK — FIXED

- Native registration mutation error.
- Native login mutation error.
- Account deletion mutation error.
- Placement-test upload/submission error.
- Recitation start/pause/resume/end/service errors.
- Fatwa submission mutation error.
- Prayer-time external/network error.
- Qibla location/native error.

### SAFE

- Fixed Arabic messages used for camera recording failure.
- Fixed Arabic messages used for missing Mushaf data.
- Permission-denied messages.
- Loading/query error components that already use a fixed generic Arabic
  message.

Post-fix targeted search found no remaining direct
`mutation.error.message`, caught `error.message`, `JSON.stringify(error)`, or
`String(error)` rendering in audited Expo application screens.

`JSON.stringify(q.data)` in the current settings screen is a data rendering
path, not an error rendering path, and was not changed by this narrowly scoped
fix.

## PRODUCTION-LIKE VERIFICATION

The following checks passed:

- Mobile TypeScript typecheck.
- Expo iOS production export: 2,301 modules bundled successfully.
- Error/validation executable test: 22 cases passed.
- Raw Zod issue array reproducing the iPhone evidence was converted to clean
  field messages without `code`, `maximum`, `inclusive`, `exact`, or `path`.
- Simulated network failure produced an Arabic connection message.
- Simulated 401/409 human server messages remained readable.
- Simulated 500, SQL, stack, and file-path errors were replaced by a safe
  fallback.
- Expo preview rendered `/register` at 402×874 with the existing design and the
  corrected one-character hint.
- Mobile Expo workflow is running and Metro reports successful iOS bundling.
- Bundle ID remains `app.replit.tbyan`.
- Version/build remain `1.0.0 (6)`.
- Expo project ID remains `bcac43ba-905a-4b13-a834-b36051da4da6`.

No real production account was created and no physical-iPhone submission was
performed during this fix.

## FINAL STATUS

```text
RAW JSON ERROR FIXED:
YES

PHONE VALIDATION:
PASS (pure validation/normalization tests)

PASSWORD VALIDATION:
PASS

CLIENT/SERVER VALIDATION MATCH:
YES

FRESH REGISTRATION:
NOT VERIFIED ON PHYSICAL IPHONE

INVALID PHONE TEST:
PASS

ONE-CHARACTER PASSWORD TEST:
PASS

WHITESPACE-ONLY PASSWORD TEST:
PASS (rejected)

NETWORK FAILURE TEST:
PASS

SERVER ERROR TEST:
PASS

RAW INTERNAL ERROR VISIBLE TO USER:
NO IN AUDITED EXPO ERROR PATHS

REGRESSION TEST:
PASS

APPLE REVIEW RISK REMOVED:
YES FOR THE CONFIRMED RAW-ERROR DEFECT IN SOURCE;
PHYSICAL IPHONE RETEST STILL REQUIRED
```

The confirmed raw validation/error rendering defect has been fixed.

This does not establish that Apple’s complete Guideline 2.1 request is resolved,
and it does not authorize a new build or resubmission.